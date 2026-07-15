"use client";
import React from "react";
import DashboardLayout from "@/components/commons/DashboardLayout";

export default function TubosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
