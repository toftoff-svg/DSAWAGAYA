"use client";

import { useEffect } from "react";

export default function ClearStaffAccess() {
  useEffect(() => {
    try {
      sessionStorage.removeItem("wagaya-admin-ok");
      sessionStorage.removeItem("wagaya-employee-ok");
    } catch {}
  }, []);

  return null;
}
