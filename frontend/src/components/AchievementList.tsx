import { HStack, Progress, VStack } from '@chakra-ui/react';
import React from 'react'
import { Achievement, AchievementType, FormattedAchievementList } from '../CoveyTypes';
import useAchievementCount from '../hooks/useAchievementCount';
import useAchievementList from '../hooks/useAchievementList';

const typeBox = {
  paddingLeft: 30,
  paddingRight: 30,
  paddingTop: 15,
  paddingBottom: 15,
  width: 400,
};

const headerBox = {
  paddingLeft: 30,
  paddingRight: 30,
  paddingTop: 10,
};

const headerFont = {
  fontWeight: 700,
  fontSize: 30,
  color: '#ffffff',
};

const keyFont = {
  fontWeight: 500,
  fontSize: 16,
  color: '#ffffff',
};

const spacer = {
  height: 5,
}

const friendlyKeys: { [key in AchievementType] : string } = {
  players: 'Joined Players',
  moves: 'Steps Taken',
  conversationAreas: 'Conversation Areas Created',
  chats: 'Chat Messages Sent',
  pokemon: 'Pokemon Caught',
};

export default function AchievementList() {
  const achievementList = useAchievementList();
  const achievementCounts = useAchievementCount();
  
  const formattedList: FormattedAchievementList = {
    players: undefined,
    moves: undefined,
    conversationAreas: undefined,
    chats: undefined,
    pokemon: undefined,
  };

  // Get minimum incomplete
  Object.values(achievementList).forEach(achievement => {
    if (!achievement.completed && !formattedList[achievement.type]) {
      formattedList[achievement.type] = achievement;
    }
  });

  Object.entries(formattedList).map(([key, achievement]) => {
    if (achievement) {
      return achievement;
    }
    const achievementsForType: Achievement[] = Object.values(achievementList).filter(a => a.type === key);
    return achievementsForType.sort((a, b) => b.threshold - a.threshold).shift();
  });



  return (
    <VStack align='flex-start' backgroundColor='#101111'>
      <div style={headerBox}>
        <h1 style={headerFont}>Town Achievements</h1>
      </div>

      {Object.entries(formattedList).map(([key, achievement]) => 
        <div style={typeBox} key={key}>
          {achievement ? 
            <div key={achievement.threshold}>
              <HStack justify='space-between'>
                <h1 style={keyFont}>{friendlyKeys[key as AchievementType]}</h1>
                <p style={keyFont}>{`${achievementCounts[key as AchievementType]}/${achievement.threshold}`}</p>
              </HStack>
              <div style={spacer} />
              <Progress size='sm' colorScheme={achievementCounts[key as AchievementType] === achievement.threshold ? 'green' : 'red'} value={(achievementCounts[key as AchievementType]/achievement.threshold)*100} />
              <HStack spacing={1}>
                {achievement.pokemonName.map(name => 
                   <img key={name} src={`/assets/pokemon/${name}.png`} alt="pokemon" style={{height: 65}}/>
                )}
              </HStack>
            </div>
            :
            <></>
          }
        </div>
      )}


    </VStack>
  )
}


