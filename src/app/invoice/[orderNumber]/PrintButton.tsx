"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn btn-primary text-xs">
      چاپ یا ذخیره PDF
    </button>
  );
}
