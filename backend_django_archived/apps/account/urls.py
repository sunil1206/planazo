from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, GoogleAuthView, MeView,
    SendOtpView, VerifyOtpView,
    ForgotPasswordView, ResetPasswordView,
)

urlpatterns = [
    path("register/",          RegisterView.as_view(),       name="auth-register"),
    path("login/",             LoginView.as_view(),          name="auth-login"),
    path("google/",            GoogleAuthView.as_view(),     name="auth-google"),
    path("refresh/",           TokenRefreshView.as_view(),   name="auth-refresh"),
    path("me/",                MeView.as_view(),             name="auth-me"),
    # Phone OTP login
    path("otp/send/",          SendOtpView.as_view(),        name="auth-otp-send"),
    path("otp/verify/",        VerifyOtpView.as_view(),      name="auth-otp-verify"),
    # Password reset
    path("password/forgot/",   ForgotPasswordView.as_view(), name="auth-password-forgot"),
    path("password/reset/",    ResetPasswordView.as_view(),  name="auth-password-reset"),
]
