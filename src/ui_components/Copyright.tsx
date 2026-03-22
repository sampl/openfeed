import { useRef, useState } from "react";

export default function Copyright({
  className = "",
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const clickCount = useRef(0);
  const clickTimer = useRef<number>();
  const [lastClickTime, setLastClickTime] = useState(0);

  const clickDebugTarget = () => {
    const now = Date.now();

    // Reset count if more than 1 second has passed since last click
    if (now - lastClickTime > 1000) {
      clickCount.current = 0;
    }

    clickCount.current++;
    setLastClickTime(now);

    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
    }

    clickTimer.current = window.setTimeout(() => {
      clickCount.current = 0;
    }, 1000);

    // Toggle debug mode after 3 rapid clicks on the year
    if (clickCount.current === 3) {
      const debug = document.body.dataset.debug;
      if (debug === "true") {
        delete document.body.dataset.debug;
      } else {
        document.body.dataset.debug = "true";
      }
      clickCount.current = 0;
    }
  };

  return (
    <span className={className} style={style}>
      <span onClick={clickDebugTarget} className="select-none cursor-default">
        © {new Date().getFullYear()}
      </span>{" "}
      <a
        href="https://directedworks.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-inherit no-underline"
        style={{ border: "none" }}
      >
        Directed Works LLC
      </a>
    </span>
  );
}
