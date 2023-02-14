import React from 'react';
import { AchievementTypeCount } from '../CoveyTypes';

export const DEFAULT_ACHIEVEMENT_COUNTS: AchievementTypeCount = {
  players: 0,
  moves: 0,
  conversationAreas: 0,
  chats: 0,
  pokemon: 0
}
/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useConversationAreas` hook.
 */
const Context = React.createContext<AchievementTypeCount>(DEFAULT_ACHIEVEMENT_COUNTS);

export default Context;
