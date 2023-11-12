/**
 * The function `longestCommonSubstring` takes two strings as input and returns the longest common
 * substring between them.
 * Adapted from https://www.geeksforgeeks.org/javascript-program-to-find-longest-common-substring-between-two-strings/
 * @param {string} str1 - The first string to compare.
 * @param {string} str2 - The `str2` parameter is a string representing the second input string for
 * finding the longest common substring.
 * @returns the longest common substring between `str1` and `str2`.
 */
export function longestCommonSubstring(str1: string, str2: string): string {
    let n = str1.length;
    let m = str2.length;

    let lcs: number[][] = [];
    for (let i = 0; i <= n; i++) {
        lcs[i] = [];
        for (let j = 0; j <= m; j++) {
            lcs[i][j] = 0;
        }
    }

    let result = "";
    let max = 0;

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            if (str1[i] === str2[j]) {
                lcs[i + 1][j + 1] = lcs[i][j] + 1;

                if (lcs[i + 1][j + 1] > max) {
                    max = lcs[i + 1][j + 1];
                    result = str1.substring(i - max + 1, i + 1);
                }
            }
        }
    }

    return result;
}
