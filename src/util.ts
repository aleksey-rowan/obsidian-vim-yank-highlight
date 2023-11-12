/**
 * Returns the longest common substring from two provided strings.
 *
 * Adapted from https://www.geeksforgeeks.org/javascript-program-to-find-longest-common-substring-between-two-strings/
 *
 * @param str1
 * @param str2
 * @returns
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
