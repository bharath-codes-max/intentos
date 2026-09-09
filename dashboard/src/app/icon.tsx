import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090A",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <rect
            x="7.6"
            y="1.2"
            width="14.2"
            height="6.4"
            rx="3.2"
            transform="rotate(35 7.6 1.2)"
            fill="url(#a)"
          />
          <rect
            x="-1.2"
            y="10.9"
            width="14.2"
            height="6.4"
            rx="3.2"
            transform="rotate(35 -1.2 10.9)"
            fill="url(#b)"
          />
          <defs>
            <linearGradient id="a" x1="7.6" y1="1.2" x2="21.8" y2="7.6" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="b" x1="-1.2" y1="10.9" x2="13" y2="17.3" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22D3EE" />
              <stop offset="1" stopColor="#4ADE80" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    size
  );
}
