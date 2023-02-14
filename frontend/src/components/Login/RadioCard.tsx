/* eslint react/jsx-props-no-spreading: 0 */
/* eslint react/destructuring-assignment: 0 */
/* eslint @typescript-eslint/no-explicit-any: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import React from 'react';
import { Box, useRadio, UseRadioProps } from '@chakra-ui/react';

export default function RadioCard(props: any) {
  const { getInputProps, getCheckboxProps } = useRadio(props as UseRadioProps);

  const input = getInputProps()
  const checkbox = getCheckboxProps()

  return (
    <Box as='label'>
      <input {...input} />
      <Box
        {...checkbox}
        cursor='pointer'
        borderWidth='1px'
        borderRadius='md'
        boxShadow='md'
        _checked={{
          // borderColor: 'red.600',
          boxShadow: '0 0 0 3px #3182CE',
          // borderWidth: '10',
        }}
        px={5}
        py={3}
      >
        {props.children}
      </Box>
    </Box>
  )
}