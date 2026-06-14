import random
import logging
import os
import secrets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import BasicAuthentication
from rest_framework_simplejwt.views import TokenRefreshView
from .serializers import (
    RegisterSerializer, LoginSerializer,
    GoogleAuthSerializer, UserSerializer, get_tokens,
)
from .models import User

logger = logging.getLogger(__name__)

OTP_TTL          = 600    # 10 minutes — phone OTP TTL
RESET_TOKEN_TTL  = 1800   # 30 minutes — password reset token TTL


def _redis_client():
    """Return a Redis client using the existing CELERY_BROKER_URL env var."""
    import redis
    url = os.environ.get("REDIS_URL") or os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0")
    return redis.from_url(url, decode_responses=True)


def _send_sms_otp(phone: str, otp: str):
    """
    Send OTP via SMS.
    Tries Twilio if TWILIO_ACCOUNT_SID is configured, otherwise logs to console.
    In production set: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
    """
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    if account_sid:
        try:
            from twilio.rest import Client
            client = Client(account_sid, os.environ["TWILIO_AUTH_TOKEN"])
            client.messages.create(
                body=f"Your Planazo OTP is {otp}. Valid for 10 minutes.",
                from_=os.environ["TWILIO_FROM_NUMBER"],
                to=phone,
            )
            logger.info("OTP SMS sent to %s via Twilio", phone)
        except Exception as e:
            logger.error("Twilio SMS failed: %s", e)
            raise
    else:
        # Development mode — log OTP to console (never do this in production!)
        logger.warning("DEV MODE — OTP for %s is: %s  (no SMS sent)", phone, otp)
        print(f"\n📱 [DEV] OTP for {phone} → {otp}\n")


# ── Public auth views — NO authentication classes so DRF never rejects
#    a request just because an expired/invalid token is present in the header.
#    AllowAny alone is not enough: DRF raises AuthenticationFailed (401) during
#    the authentication phase BEFORE it ever checks permission_classes. ────────

class RegisterView(APIView):
    authentication_classes = []   # skip JWT auth entirely for public endpoints
    permission_classes     = [AllowAny]

    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(get_tokens(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    authentication_classes = []   # must NOT validate any token — user has none yet
    permission_classes     = [AllowAny]

    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(get_tokens(s.validated_data["user"]))


class GoogleAuthView(APIView):
    authentication_classes = []
    permission_classes     = [AllowAny]

    def post(self, request):
        s = GoogleAuthSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(get_tokens(s.validated_data["user"]))


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        s = UserSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


# ── Phone OTP ─────────────────────────────────────────────────────────────────

class SendOtpView(APIView):
    """
    POST /api/auth/otp/send/
    Body: { "phone": "+919876543210" }

    Generates a 6-digit OTP, stores it in Redis for 10 min, and sends it via SMS.
    In dev mode (no Twilio configured) the OTP is returned in the response body
    for easy testing.  REMOVE this in production!
    """
    authentication_classes = []
    permission_classes     = [AllowAny]

    def post(self, request):
        phone = request.data.get("phone", "").strip()
        if not phone:
            return Response({"detail": "Phone number is required."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Basic E.164 sanity check
        if not phone.startswith("+") or len(phone) < 10:
            return Response(
                {"detail": "Phone must be in E.164 format, e.g. +919876543210"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = f"{random.randint(100_000, 999_999)}"
        redis_key = f"otp:{phone}"

        try:
            r = _redis_client()
            r.set(redis_key, otp, ex=OTP_TTL)
        except Exception as e:
            logger.error("Redis OTP store failed: %s", e)
            return Response({"detail": "Could not generate OTP. Please try again."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            _send_sms_otp(phone, otp)
        except Exception:
            return Response({"detail": "SMS delivery failed. Please try again later."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Dev-only: return OTP so testers don't need a real phone
        is_dev = not os.environ.get("TWILIO_ACCOUNT_SID")
        response_data = {
            "detail": f"OTP sent to {phone}. Valid for 10 minutes.",
            "expires_in": OTP_TTL,
        }
        if is_dev:
            response_data["dev_otp"] = otp   # ← remove in production

        return Response(response_data)


class VerifyOtpView(APIView):
    """
    POST /api/auth/otp/verify/
    Body: { "phone": "+919876543210", "otp": "123456", "full_name": "...", "role": "COUPLE" }

    Verifies the OTP, creates the user if new, returns JWT tokens.
    """
    authentication_classes = []
    permission_classes     = [AllowAny]

    def post(self, request):
        phone     = request.data.get("phone", "").strip()
        otp       = request.data.get("otp", "").strip()
        full_name = request.data.get("full_name", "").strip()
        role      = request.data.get("role", User.COUPLE).upper()

        if not phone or not otp:
            return Response({"detail": "Phone and OTP are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        redis_key = f"otp:{phone}"
        try:
            r = _redis_client()
            stored_otp = r.get(redis_key)
        except Exception as e:
            logger.error("Redis OTP get failed: %s", e)
            return Response({"detail": "Could not verify OTP. Please try again."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if stored_otp is None:
            return Response({"detail": "OTP expired or not found. Please request a new one."},
                            status=status.HTTP_400_BAD_REQUEST)

        if stored_otp != otp:
            return Response({"detail": "Incorrect OTP. Please try again."},
                            status=status.HTTP_400_BAD_REQUEST)

        # OTP valid — delete it so it can't be reused
        r.delete(redis_key)

        # Derive a pseudo-email from phone for users without a real email
        pseudo_email = f"phone_{phone.replace('+', '')}@planazo.internal"

        user, created = User.objects.get_or_create(
            phone=phone,
            defaults={
                "email":     pseudo_email,
                "full_name": full_name or f"User {phone[-4:]}",
                "role":      role if role in ("COUPLE", "VENDOR") else User.COUPLE,
            },
        )

        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])

        return Response(get_tokens(user), status=status.HTTP_200_OK)


# ── Password Reset ─────────────────────────────────────────────────────────────

class ForgotPasswordView(APIView):
    """
    POST /api/auth/password/forgot/
    Body: { "email": "user@example.com" }

    Generates a secure reset token, stores it in Redis for 30 min.
    In dev mode (no EMAIL_HOST configured) the token is returned in the response
    so you can test the reset flow without a real email server.
    In production, send the token via email.
    """
    authentication_classes = []
    permission_classes     = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"detail": "Email is required."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Always return 200 — never reveal whether email exists (security)
        success_response = {
            "detail": "If an account with that email exists, a reset link has been sent.",
        }

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(success_response)

        token     = secrets.token_urlsafe(32)
        redis_key = f"pwd_reset:{token}"

        try:
            r = _redis_client()
            r.set(redis_key, str(user.pk), ex=RESET_TOKEN_TTL)
        except Exception as e:
            logger.error("Redis password reset store failed: %s", e)
            return Response({"detail": "Could not initiate reset. Please try again."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Dev mode — no real email server configured
        is_dev = not os.environ.get("EMAIL_HOST")
        if is_dev:
            logger.warning("DEV MODE — Password reset token for %s: %s", email, token)
            print(f"\n🔑 [DEV] Password reset token for {email} → {token}\n")
            success_response["dev_token"] = token
            success_response["dev_reset_url"] = f"http://localhost:3000/reset-password?token={token}"
        else:
            # Production: send email via Resend / SMTP
            try:
                self._send_reset_email(email, user.full_name, token)
            except Exception as e:
                logger.error("Failed to send password reset email: %s", e)
                # Don't leak info — still return success
        return Response(success_response)

    def _send_reset_email(self, email: str, name: str, token: str):
        reset_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={token}"
        resend_key = os.environ.get("RESEND_API_KEY")
        if resend_key:
            import resend
            resend.api_key = resend_key
            resend.Emails.send({
                "from":    "Planazo <noreply@planazo.in>",
                "to":      [email],
                "subject": "Reset your Planazo password",
                "html":    f"""
                    <p>Hi {name},</p>
                    <p>Click below to reset your password. This link expires in 30 minutes.</p>
                    <p><a href="{reset_url}" style="background:#8B1A4A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a></p>
                    <p>If you didn't request this, ignore this email.</p>
                    <p>— Planazo Team</p>
                """,
            })


class ResetPasswordView(APIView):
    """
    POST /api/auth/password/reset/
    Body: { "token": "...", "password": "newpassword123" }

    Validates the reset token and updates the user's password.
    """
    authentication_classes = []
    permission_classes     = [AllowAny]

    def post(self, request):
        token    = request.data.get("token", "").strip()
        password = request.data.get("password", "").strip()

        if not token or not password:
            return Response({"detail": "Token and new password are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({"detail": "Password must be at least 8 characters."},
                            status=status.HTTP_400_BAD_REQUEST)

        redis_key = f"pwd_reset:{token}"
        try:
            r = _redis_client()
            user_id = r.get(redis_key)
        except Exception as e:
            logger.error("Redis password reset get failed: %s", e)
            return Response({"detail": "Could not verify reset token. Please try again."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if user_id is None:
            return Response({"detail": "Reset link has expired or is invalid. Please request a new one."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=int(user_id))
        except User.DoesNotExist:
            return Response({"detail": "User not found."},
                            status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=["password"])

        # Invalidate token so it can't be reused
        r.delete(redis_key)

        logger.info("Password reset successful for user %s", user.email)
        return Response({"detail": "Password updated successfully. You can now sign in."})
