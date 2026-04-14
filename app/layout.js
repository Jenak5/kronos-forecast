import "./globals.css";

export const metadata = {
  title: "Kronos Forecast",
  description: "NQ/ES futures forecast dashboard powered by fine-tuned Kronos AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
