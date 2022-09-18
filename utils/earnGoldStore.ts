import { signal } from "@preact/signals-react";

export const tweet_id = signal("");
export const endedQuotas = signal({
  like: false,
  comment: false,
  follow: false,
});
export const ordinemUsers = signal<any[]>([]);

export const usersToFollow = signal<any[]>([]);
export const userToFollow = signal<any>(null);
export const indexOfUserToFollow = signal(0);
