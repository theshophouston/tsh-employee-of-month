import "./globals.css";
import React from "react";

export const metadata = {
  title: "TSH Employee of the Month",
  description: "Internal voting app"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}

