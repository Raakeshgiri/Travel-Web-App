import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Outlet, Navigate } from "react-router-dom";
import Spinner from "../components/Spinner";

export default function PrivateRoute() {
  const { currentUser } = useSelector((state) => state.user);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);

  const authCheck = async () => {
    try {
      const res = await fetch("/api/user/user-auth", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const data = await res.json();
      if (data.check) {
        setOk(true);
      } else {
        setOk(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setOk(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser !== null) {
      authCheck();
    } else {
      setLoading(false);
      setOk(false);
    }
  }, [currentUser]);

  if (loading) return <Spinner />;
  return ok ? <Outlet /> : <Navigate to="/login" />;
}
