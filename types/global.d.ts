export {};

declare global {
  type Twitter = {
    screenName: string;
    displayName?: string;
    image: string;
  };

  interface NFT {
    level: number;
    image: string;
    name: string;
    tokenEarned: number;
    twitter?: Twitter;
    mint?: string;
  }
}
