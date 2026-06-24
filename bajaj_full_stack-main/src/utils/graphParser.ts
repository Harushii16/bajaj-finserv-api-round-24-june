import { IDENTITY } from "../config/identity";

export function processData(data: unknown) {
  const odd_numbers: string[] = [];
  const even_numbers: string[] = [];
  const alphabets: string[] = [];
  const special_characters: string[] = [];

  let sum = 0;
  const alphaList: string[] = [];

  if (!data || !Array.isArray(data)) {
    return {
      ...IDENTITY,
      is_success: false,
      odd_numbers,
      even_numbers,
      alphabets,
      special_characters,
      sum: "0",
      concat_string: ""
    };
  }

  for (const item of data) {
    const str = String(item);

    // number
    if (/^-?\d+$/.test(str)) {
      const num = parseInt(str, 10);
      sum += num;

      if (num % 2 === 0) {
        even_numbers.push(str);
      } else {
        odd_numbers.push(str);
      }
    }
    // alphabet
    else if (/^[a-zA-Z]$/.test(str)) {
      const upper = str.toUpperCase();
      alphabets.push(upper);
      alphaList.push(upper);
    }
    // special character
    else {
      special_characters.push(str);
    }
  }

  // concat_string logic (reverse + alternating case)
  const reversed = alphaList.reverse();

  let concat_string = "";
  for (let i = 0; i < reversed.length; i++) {
    const ch = reversed[i];
    concat_string += i % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase();
  }

  return {
    ...IDENTITY,
    is_success: true,
    odd_numbers,
    even_numbers,
    alphabets,
    special_characters,
    sum: String(sum),
    concat_string
  };
}