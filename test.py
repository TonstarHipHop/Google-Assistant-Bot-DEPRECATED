import sys
import itertools
import operator

ops = {
    '+' : operator.add,
    '-' : operator.sub,
    '*' : operator.mul,
}

def try_ops(nums, result, ops_applied):
    # stop when 4 operators been applied and check the result
    if ops_applied == 4:
        if result == 42:
            return True
        return False
    
    # Go through all permtations of operators
    for op in ops:
        new_result = ops[op](result, nums[ops_applied+1])
        if try_ops(nums, new_result, ops_applied+1):
            print(op)
            return True
    return False
    
for line in sys.stdin:
    cards = line.split()
    cards = [int(card) for card in cards]
    perms = itertools.permutations(cards)
    found = 0
    for perm in perms:
        if (try_ops(perm, perm[0], 0)):
            found = 1    #flag
            break
    if (found):
        print(perm)
        print("YES")
    else:
        print("NO")
                            
