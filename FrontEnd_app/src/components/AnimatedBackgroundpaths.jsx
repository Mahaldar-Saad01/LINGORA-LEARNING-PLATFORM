export default function AnimatedBackgroundPaths() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* ================= LEFT SIDE ================= */}

      {/* Path 1 */}
      <svg
        className="absolute left-0 top-0 h-full w-[180px] opacity-15"
        viewBox="0 0 220 2000"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          className="dashboard-path dashboard-path-slow"
          d="
            M110 0
            C110 130 20 200 20 360
            C20 560 180 620 180 840
            C180 1060 30 1130 30 1370
            C30 1590 170 1660 170 1880
            C170 1950 110 2000 110 2000
          "
          stroke="#0f6f25"
          strokeWidth="3"
          strokeDasharray="2 14"
          strokeLinecap="round"
        />
      </svg>

      {/* Path 2 */}
      <svg
        className="absolute left-8 top-0 h-full w-[220px] opacity-25"
        viewBox="0 0 220 2000"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          className="dashboard-path dashboard-path-medium"
          d="
            M120 0
            C120 160 190 230 190 420
            C190 610 40 700 40 910
            C40 1110 180 1180 180 1420
            C180 1640 50 1710 50 1940
          "
          stroke="#0f6f25"
          strokeWidth="4"
          strokeDasharray="2 12"
          strokeLinecap="round"
        />
      </svg>

      {/* Path 3 */}
      <svg
        className="absolute left-16 top-0 h-full w-[240px] opacity-35"
        viewBox="0 0 240 2000"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          className="dashboard-path dashboard-path-fast"
          d="
            M120 0
            C120 120 40 200 40 360
            C40 560 210 650 210 870
            C210 1080 50 1160 50 1380
            C50 1590 180 1680 180 1910
          "
          stroke="#0f6f25"
          strokeWidth="5"
          strokeDasharray="2 10"
          strokeLinecap="round"
        />
      </svg>

      {/* ================= RIGHT SIDE ================= */}

      {/* Path 1 */}
      <svg
        className="absolute right-0 top-0 h-full w-[180px] opacity-15"
        viewBox="0 0 220 2000"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          className="dashboard-path dashboard-path-slow dashboard-delay-1"
          d="
            M110 0
            C110 140 200 210 200 390
            C200 600 40 690 40 910
            C40 1130 180 1210 180 1430
            C180 1660 70 1730 70 1950
          "
          stroke="#0f6f25"
          strokeWidth="3"
          strokeDasharray="2 14"
          strokeLinecap="round"
        />
      </svg>

      {/* Path 2 */}
      <svg
        className="absolute right-8 top-0 h-full w-[220px] opacity-25"
        viewBox="0 0 220 2000"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          className="dashboard-path dashboard-path-medium dashboard-delay-2"
          d="
            M100 0
            C100 150 30 240 30 430
            C30 650 190 730 190 940
            C190 1160 40 1240 40 1450
            C40 1680 160 1760 160 1960
          "
          stroke="#0f6f25"
          strokeWidth="4"
          strokeDasharray="2 12"
          strokeLinecap="round"
        />
      </svg>

      {/* Path 3 */}
      <svg
        className="absolute right-16 top-0 h-full w-[240px] opacity-35"
        viewBox="0 0 240 2000"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          className="dashboard-path dashboard-path-fast dashboard-delay-3"
          d="
            M120 0
            C120 120 210 220 210 420
            C210 620 40 700 40 930
            C40 1160 180 1240 180 1470
            C180 1700 70 1780 70 1980
          "
          stroke="#0f6f25"
          strokeWidth="5"
          strokeDasharray="2 10"
          strokeLinecap="round"
        />
      </svg>

      <style>{`
        .dashboard-path{
          stroke-dashoffset:800;
          animation:flow linear infinite;
        }

        .dashboard-path-slow{
          animation-duration:28s;
        }

        .dashboard-path-medium{
          animation-duration:20s;
        }

        .dashboard-path-fast{
          animation-duration:14s;
        }

        .dashboard-delay-1{
          animation-delay:4s;
        }

        .dashboard-delay-2{
          animation-delay:8s;
        }

        .dashboard-delay-3{
          animation-delay:12s;
        }

        @keyframes flow{
          from{
            stroke-dashoffset:800;
          }
          to{
            stroke-dashoffset:0;
          }
        }
      `}</style>
    </div>
  )
}