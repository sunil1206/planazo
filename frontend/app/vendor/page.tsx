"use client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function VendorHomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/vendor/portfolio", { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen text-5xl animate-pulse" style={{ color: "#C9952A" }}>
      📷
    </div>
  );
}
