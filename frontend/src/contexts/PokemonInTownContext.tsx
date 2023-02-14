import React from 'react';
import Pokemon from '../classes/Pokemon';

const Context = React.createContext<Pokemon[]>([]);

export default Context;
