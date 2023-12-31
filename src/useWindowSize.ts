// useWindowSize.ts
import { useState, useEffect } from "react";

function getWindowDimensions() {
  const { outerWidth: width, outerHeight: height } = window;
  return { width, height };
}

export function useWindowSize() {
  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions()
  );

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    height: Math.min(windowDimensions.width, windowDimensions.height),
    width: Math.min(windowDimensions.width, windowDimensions.height),
  };
}
