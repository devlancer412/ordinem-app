import { useNotification } from "hooks/useNotification";
import React from "react";

interface Props {
  goldRecieved: number;
  quest: string;
  signature?: string;
}

const SuccessPopup: React.FC<Props> = ({ goldRecieved, quest, signature }) => {
  const { closeNotification } = useNotification();
  return (
    <div className="bg-gray-800 max-w-xl mx-4 border-2 items-center border-white px-5 py-3 rounded-lg flex gap-6 flex-col md:flex-row">
      <div className="order-2 md:order-1">
        <h2 className="text-2xl font-semibold">Congratulations! 🎉</h2>
        <h4 className="text-gray-300">
          You have received {goldRecieved} Gold for completing the {quest}{" "}
          quest.
        </h4>
        {signature && signature?.length > 0 ? (
          <a
            className="text-gray-700 bg-white rounded-lg px-5 py-3 mt-4 inline-flex"
            href={`https://solscan.io/tx/${signature}`}
            target="_blank"
            rel="noreferrer"
          >
            Go to this url to check the transaction
          </a>
        ) : (
          <button
            className="text-gray-700 bg-white rounded-lg px-5 py-3 mt-4 inline-flex"
            onClick={closeNotification}
          >
            Close
          </button>
        )}
      </div>
      <img
        className="order-1 md:order-2"
        src="/gold_pile_rewards.png"
        alt="Reward gold tokens"
      />
    </div>
  );
};

export default SuccessPopup;
