import { Tab } from "@headlessui/react";
import { Fragment } from "react";

export default function EarnGold() {
  const tabs = ["Daily Quests", "Follow", "Like", "Comment", "Retweet"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
      <Tab.Group>
        <Tab.List className="flex md:flex-col gap-x-3 gap-y-6">
          {tabs.map((tab, i) => (
            <Tab key={i} as={Fragment}>
              {({ selected }) => (
                <button
                  className={`text-white px-5 py-2 rounded-md border border-gray-800 dark:border-gray-400 ${
                    selected ? "bg-gradient text-gray-800 dark:text-white" : "bg-gray-800"
                  }`}
                >
                  {tab}
                </button>
              )}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="md:col-span-2 text-white">
          {tabs.map((tab, i) => (
            <Tab.Panel
              className="bg-[#270318] border border-gray-400 px-5 py-3 rounded-md h-full"
              key={i}
            >
              {tab}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
