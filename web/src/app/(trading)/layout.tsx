import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { MockDataProvider } from "@/components/providers/MockDataProvider";

export default function TradingRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Header />
      <MockDataProvider>{children}</MockDataProvider>
    </div>
  );
}
