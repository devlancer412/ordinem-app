import { useAlert } from "hooks/useAlert";
import { useEffect } from "react";

let debounced: NodeJS.Timeout;
const Alert = () => {
  const { show, message, status, close } = useAlert();

  useEffect(() => {
    if (message.length > 0 && show) {
      clearTimeout(debounced);
      debounced = setTimeout(close, 1000);
    }
  }, [show, message]);

  return (
    <div
      className={`fixed max-w-sm px-4 py-3 text-white -top-10 left-1/2 transform-gpu translate-x-1/2 duration-150 ${
        show ? "translate-y-10" : "translate-y-0"
      } ${status === "error" ? "bg-red-500" : "bg-green-500"}`}
    >
      {message}
    </div>
  );
};

export default Alert;
