import assert from 'assert';
import { useContext } from 'react';
import AchievementListContext from '../contexts/AchievementListContext';
import { AchievementList } from '../CoveyTypes';

/**
 * This hook provides access to the current list of conversation areas
 * The hook will trigger the components that use it to re-render ONLY if the list of active 
 * conversation areas changes.
 * 
 * Components that need to be re-rendered if the *occupants* of the conversation area change must
 * arrange to do so by setting up their own listener on the conversation area.
 * 
 */
export default function useConversationAreas(): AchievementList {
  const ctx = useContext(AchievementListContext);
  assert(ctx, 'Achievement list context should be defined.');
  return ctx;
}
