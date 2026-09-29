import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s — Panel · Czechowickie Żule" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
