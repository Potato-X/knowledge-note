//利用栈来实现符号配对问题
function isValid(s) {
    let stack = [];
    const emuMap = {
        "}": "{",
        "]": "[",
        ")": "(",
    };
    for (let i = 0; i < s.length; i++) {
        if (Object.keys(emuMap).includes(s[i])) {
            if (stack.pop() != emuMap[s[i]]) return false;
        } else {
            stack.push(s[i]);
        }
    }
    return stack.length == 0;
};