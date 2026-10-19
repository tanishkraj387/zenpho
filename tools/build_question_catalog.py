import json
from pathlib import Path
from collections import Counter, deque
repo=Path(__file__).resolve().parents[1]
root=repo/'frontend/src/data'
test_file=repo/'judge-data/question-tests.json'
questions=json.loads((root/'questions.json').read_text())
tests=json.loads(test_file.read_text())

# Each entry provides one public problem, a reference answer for authoring checkpoints,
# and independent sample, hidden, and large-input cases.
def add(slug,title,difficulty,topic,description,params,examples,hidden,large,answer,constraints,initial='None'):
    if slug in tests:
        questions[:] = [question for question in questions if question['id'] != slug]
        del tests[slug]
    def display(value): return json.dumps(value,ensure_ascii=False,separators=(',', ':'))
    def case(values):
        payload=dict(zip(params, values))
        return {'input':payload,'expected':answer(**payload)}
    suite={'samples':[case(v) for v in examples], 'hidden':[case(v) for v in hidden], 'efficiency':[case(large)]}
    tests[slug]=suite
    questions.append({
        'id':slug,'title':title,'difficulty':difficulty,'topic':topic,'description':description,
        'encounterPokemonId':{'arrays':54,'strings':25,'graphs':92,'trees':133,'dp':65,'math':74}[topic],
        'constraints':constraints,
        'examples':[{'input':', '.join(f'{p} = {display(v)}' for p,v in zip(params,values)), 'output':display(case(values)['expected'])} for values in examples],
        'starterCode':{
            'python':f'def solve({", ".join(params)}):\n    return {initial}\n',
            'javascript':f'export function solve({", ".join(params)}) {{\n  return {"false" if initial == "False" else "null" if initial == "None" else initial if initial in ("0", "[]", "-1", "\"\"") else "null"}\n}}\n'
        }
    })

def move_zeroes(nums): return [x for x in nums if x != 0]+[0]*nums.count(0)
def rotate(nums,k): return nums[-(k%len(nums)):] + nums[:-(k%len(nums))] if nums else []
def majority(nums): return Counter(nums).most_common(1)[0][0]
def pivot(nums):
    total=sum(nums); left=0
    for i,x in enumerate(nums):
        if left==total-left-x: return i
        left+=x
    return -1
def roman(s):
    values={'I':1,'V':5,'X':10,'L':50,'C':100,'D':500,'M':1000}
    return sum(-values[x] if i+1<len(s) and values[x]<values[s[i+1]] else values[x] for i,x in enumerate(s))
def balanced(s):
    stack=[]; match={')':'(',']':'[','}':'{'}
    for c in s:
        if c in '([{': stack.append(c)
        elif not stack or stack.pop()!=match[c]: return False
    return not stack
def longest_distinct(s):
    last={}; left=best=0
    for i,c in enumerate(s):
        left=max(left,last.get(c,-1)+1); last[c]=i; best=max(best,i-left+1)
    return best
def isomorphic(s,t):
    a={}; b={}
    for x,y in zip(s,t):
        if (x in a and a[x]!=y) or (y in b and b[y]!=x): return False
        a[x]=y; b[y]=x
    return len(s)==len(t)
def count_primes(n):
    if n<3: return 0
    prime=[True]*n; prime[0]=prime[1]=False
    for p in range(2,int(n**.5)+1):
        if prime[p]:
            for x in range(p*p,n,p): prime[x]=False
    return sum(prime)
def house(nums):
    previous=best=0
    for n in nums: previous,best=best,max(best,previous+n)
    return best
def min_cost(cost):
    a=b=0
    for x in cost: a,b=b,x+min(a,b)
    return min(a,b)
def unique_paths(m,n):
    row=[1]*n
    for _ in range(m-1):
        for i in range(n-2,-1,-1): row[i]+=row[i+1]
    return row[0]
def coin_min(coins,amount):
    dp=[amount+1]*(amount+1);dp[0]=0
    for a in range(1,amount+1):
        for c in coins:
            if c<=a: dp[a]=min(dp[a],dp[a-c]+1)
    return -1 if dp[amount]>amount else dp[amount]
def flood(image,sr,sc,color):
    image=[row[:] for row in image];old=image[sr][sc]
    if old==color:return image
    queue=[(sr,sc)];image[sr][sc]=color
    for r,c in queue:
        for nr,nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
            if 0<=nr<len(image) and 0<=nc<len(image[0]) and image[nr][nc]==old:
                image[nr][nc]=color;queue.append((nr,nc))
    return image
def components(n,edges):
    parent=list(range(n))
    def find(x):
        while parent[x]!=x:
            parent[x]=parent[parent[x]];x=parent[x]
        return x
    for a,b in edges: parent[find(a)]=find(b)
    return len({find(x) for x in range(n)})
def valid_path(n,edges,source,destination):
    graph=[[] for _ in range(n)]
    for a,b in edges: graph[a].append(b);graph[b].append(a)
    seen={source};queue=[source]
    for node in queue:
        if node==destination:return True
        for neighbor in graph[node]:
            if neighbor not in seen:seen.add(neighbor);queue.append(neighbor)
    return False
def same_tree(p,q):
    def normalize(a):
        a=a[:]
        while a and a[-1] is None:a.pop()
        return a
    return normalize(p)==normalize(q)
def min_depth(root):
    if not root:return 0
    queue=deque([(0,1)])
    while queue:
        i,d=queue.popleft()
        if i>=len(root) or root[i] is None:continue
        left=2*i+1;right=left+1
        if (left>=len(root) or root[left] is None) and (right>=len(root) or root[right] is None):return d
        queue.extend([(left,d+1),(right,d+1)])
    return 0

add('easy-arrays-contains-duplicate','Contains Duplicate','easy','arrays','Given an integer array nums, return true if any value appears at least twice. Otherwise return false.',['nums'],[[[1,2,3,1]],[[1,2,3,4]]],[[[]],[[0,-1,0]]],[list(range(1500))+[500]],lambda nums:len(nums)!=len(set(nums)),['0 <= nums.length <= 100000','-1000000000 <= nums[i] <= 1000000000'],'False')
add('easy-arrays-best-profit','Best Time to Buy and Sell Stock','easy','arrays','Given daily prices, choose one day to buy and a later day to sell. Return the maximum profit, or 0 if no profit is possible.',['prices'],[[[7,1,5,3,6,4]],[[7,6,4,3,1]]],[[[2]],[[2,4,1,5]]],[list(range(1500,0,-1))+[2000]],lambda prices:max([0]+[prices[j]-min(prices[:j]) for j in range(1,len(prices))]),['1 <= prices.length <= 100000','0 <= prices[i] <= 10000'],'0')
add('easy-arrays-move-zeroes','Move Zeroes','easy','arrays','Move every zero to the end of nums while preserving the relative order of nonzero values. Return the updated array.',['nums'],[[[0,1,0,3,12]],[[0]]],[[[]],[[1,0,2,0,3]]],[[0 if i%3==0 else i for i in range(1500)]],move_zeroes,['0 <= nums.length <= 100000','-100000 <= nums[i] <= 100000'],'[]')
add('medium-arrays-rotate','Rotate Array','medium','arrays','Rotate nums to the right by k positions. Return the rotated array.',['nums','k'],[[[1,2,3,4,5,6,7],3],[[-1,-100,3,99],2]],[[[],4],[[1],100]],[[i for i in range(1500)],317],rotate,['0 <= nums.length <= 100000','0 <= k <= 100000'],'[]')
add('easy-arrays-missing-number','Missing Number','easy','arrays','nums contains distinct numbers from 0 through n with exactly one missing. Return the missing number.',['nums'],[[[3,0,1]],[[0,1]]],[[[]],[[9,6,4,2,3,5,7,0,1]]],[[i for i in range(1501) if i!=731]],lambda nums:len(nums)*(len(nums)+1)//2-sum(nums),['0 <= nums.length <= 100000','Every value is unique and lies in [0, nums.length].'],'0')
add('easy-arrays-intersection','Intersection of Two Arrays','easy','arrays','Return the distinct values present in both nums1 and nums2 in ascending order.',['nums1','nums2'],[[[1,2,2,1],[2,2]],[[4,9,5],[9,4,9,8,4]]],[[[],[1]],[[1,2,3],[4,5]]],[[i%1000 for i in range(1500)],[i for i in range(500,1400)]],lambda nums1,nums2:sorted(set(nums1)&set(nums2)),['0 <= nums1.length, nums2.length <= 100000','-100000 <= nums1[i], nums2[i] <= 100000'],'[]')
add('easy-arrays-majority','Majority Element','easy','arrays','Return the value that appears more than floor(nums.length / 2) times. Such a value always exists.',['nums'],[[[3,2,3]],[[2,2,1,1,1,2,2]]],[[[1]],[[0,0,0,-1,-1]]],[[7]*1001+list(range(999))],majority,['1 <= nums.length <= 100000','A majority value is guaranteed.'],'0')
add('easy-arrays-sorted-squares','Squares of a Sorted Array','easy','arrays','nums is sorted in nondecreasing order. Return the squares of its values in nondecreasing order.',['nums'],[[[-4,-1,0,3,10]],[[-7,-3,2,3,11]]],[[[]],[[0]]],[[i for i in range(-750,750)]],lambda nums:sorted(x*x for x in nums),['0 <= nums.length <= 100000','-10000 <= nums[i] <= 10000'],'[]')
add('easy-arrays-binary-search','Binary Search','easy','arrays','Given distinct integers nums sorted in ascending order, return the index of target or -1 if it is absent.',['nums','target'],[[[-1,0,3,5,9,12],9],[[-1,0,3,5,9,12],2]],[[[],1],[[1],1]],[[2*i for i in range(1500)],1998],lambda nums,target:nums.index(target) if target in nums else -1,['0 <= nums.length <= 100000','nums is strictly increasing.'],'-1')
add('easy-arrays-pivot-index','Find Pivot Index','easy','arrays','Return the first index whose left-side sum equals its right-side sum. An empty side has sum 0. Return -1 if none exists.',['nums'],[[[1,7,3,6,5,6]],[[1,2,3]]],[[[2,1,-1]],[[0]]],[[0]*1500],pivot,['1 <= nums.length <= 100000','-1000 <= nums[i] <= 1000'],'-1')
add('easy-strings-reverse-words','Reverse Words in a String','easy','strings','Reverse the order of words in s. A word is a run of non-space characters. Join words with one space.',['s'],[['the sky is blue'],['  hello world  ']],[[""],['a good   example']],['word '*1000],lambda s:' '.join(reversed(s.split())),['0 <= s.length <= 100000','s contains printable characters and spaces.'],'""')
add('easy-strings-valid-anagram','Valid Anagram','easy','strings','Return true if t contains the same characters with the same counts as s, in any order.',['s','t'],[['anagram','nagaram'],['rat','car']],[['',''],['a','aa']],['abc'*500,'cba'*500],lambda s,t:Counter(s)==Counter(t),['0 <= s.length, t.length <= 100000','Inputs use lowercase English letters.'],'False')
add('easy-strings-common-prefix','Longest Common Prefix','easy','strings','Return the longest prefix shared by every string in strs. If there is no shared prefix, return an empty string.',['strs'],[[['flower','flow','flight']],[['dog','racecar','car']]],[[[]],[['same']]],[[f'prefix{i}' for i in range(1000)]],lambda strs:__import__('os').path.commonprefix(strs) if strs else '',['0 <= strs.length <= 1000','0 <= strs[i].length <= 200'],'""')
add('easy-strings-roman-integer','Roman to Integer','easy','strings','Convert a valid Roman numeral s to its integer value. Subtractive pairs such as IV and IX are allowed.',['s'],[['III'],['MCMXCIV']],[['IV'],['LVIII']],['MMMCMXCIX'],roman,['1 <= s.length <= 15','s is a valid Roman numeral from 1 to 3999.'],'0')
add('easy-strings-valid-parentheses','Valid Parentheses','easy','strings','Return true if every opening bracket has a matching closing bracket in the correct order.',['s'],[['()[]{}'],['(]']],[[''],['([{}])']],['()[]{}'*500],balanced,['0 <= s.length <= 100000','s contains only (), [], and {}.'],'False')
add('medium-strings-longest-substring','Longest Substring Without Repeating Characters','medium','strings','Return the length of the longest contiguous substring of s with no repeated character.',['s'],[['abcabcbb'],['bbbbb']],[[''],['pwwkew']],['abcdefghijklmnopqrstuvwxyz'*80],longest_distinct,['0 <= s.length <= 100000','s contains printable ASCII characters.'],'0')
add('easy-strings-isomorphic','Isomorphic Strings','easy','strings','Return true if each character of s can be mapped consistently to one unique character of t.',['s','t'],[['egg','add'],['foo','bar']],[['paper','title'],['ab','aa']],['abc'*500,'xyz'*500],isomorphic,['1 <= s.length, t.length <= 100000','s and t have the same length.'],'False')
add('medium-math-count-primes','Count Primes','medium','math','Return the number of prime numbers strictly less than n.',['n'],[[10],[0]],[[2],[30]],[10000],count_primes,['0 <= n <= 1000000'],'0')
add('easy-math-palindrome-number','Palindrome Number','easy','math','Return true if the decimal digits of x read the same from both ends. Negative values are not palindromes.',['x'],[[121],[-121]],[[0],[10]],[123456789],lambda x:x>=0 and str(x)==str(x)[::-1],['-2147483648 <= x <= 2147483647'],'False')
add('easy-math-power-two','Power of Two','easy','math','Return true if n is a positive power of two.',['n'],[[1],[16]],[[3],[0]],[2**30],lambda n:n>0 and n&(n-1)==0,['-2147483648 <= n <= 2147483647'],'False')
add('medium-math-trailing-zeroes','Factorial Trailing Zeroes','medium','math','Return the number of trailing zero digits in n factorial.',['n'],[[3],[5]],[[0],[25]],[100000],lambda n:sum(n//(5**p) for p in range(1,12)),['0 <= n <= 1000000000'],'0')
add('medium-dp-house-robber','House Robber','medium','dp','Choose nonadjacent houses to maximize the sum of their values. Return the largest possible sum.',['nums'],[[[1,2,3,1]],[[2,7,9,3,1]]],[[[]],[[2,1,1,2]]],[[i%10 for i in range(1500)]],house,['0 <= nums.length <= 100000','0 <= nums[i] <= 1000'],'0')
add('easy-dp-min-cost-stairs','Min Cost Climbing Stairs','easy','dp','Pay cost[i] when stepping on stair i. You may start at stair 0 or 1 and climb one or two steps. Return the minimum cost to step beyond the array.',['cost'],[[[10,15,20]],[[1,100,1,1,1,100,1,1,100,1]]],[[[0,0]],[[5,6]]],[[i%7+1 for i in range(1500)]],min_cost,['2 <= cost.length <= 100000','0 <= cost[i] <= 999'],'0')
add('medium-dp-unique-paths','Unique Paths','medium','dp','A robot starts at the top-left of an m by n grid and moves only right or down. Return the number of ways to reach the bottom-right.',['m','n'],[[3,7],[3,2]],[[1,1],[2,2]],[15,15],unique_paths,['1 <= m, n <= 15'],'0')
add('medium-dp-coin-change','Coin Change','medium','dp','Given coin denominations and an amount, return the fewest coins needed to make the amount, or -1 if impossible. Coins may be reused.',['coins','amount'],[[[1,2,5],11],[[2],3]],[[[1],0],[[2,5,10],17]],[[1,2,5,10,20,50],1500],coin_min,['1 <= coins.length <= 20','1 <= coins[i] <= 10000','0 <= amount <= 10000'],'-1')
add('medium-graphs-flood-fill','Flood Fill','medium','graphs','Starting at image[sr][sc], change that cell and every connected cell with its original color to color. Cells connect horizontally or vertically. Return the new image.',['image','sr','sc','color'],[[[[1,1,1],[1,1,0],[1,0,1]],1,1,2],[[[0,0,0],[0,0,0]],0,0,0]],[[[[1]],0,0,2],[[[1,2],[2,1]],0,0,3]],[[[1]*40 for _ in range(40)],0,0,2],flood,['1 <= image.length, image[i].length <= 50','0 <= sr < image.length; 0 <= sc < image[0].length'],'[]')
add('medium-graphs-components','Number of Connected Components','medium','graphs','Given n nodes numbered 0 through n-1 and undirected edges, return the number of connected components.',['n','edges'],[[5,[[0,1],[1,2],[3,4]]],[5,[[0,1],[1,2],[2,3],[3,4]]]],[ [1,[]],[4,[]] ],[1000,[[i,i+1] for i in range(0,999,2)]],components,['1 <= n <= 100000','0 <= edges.length <= 200000','Each edge joins two distinct valid nodes.'],'0')
add('easy-graphs-valid-path','Find if Path Exists in Graph','easy','graphs','Given an undirected graph, return true if there is a path from source to destination.',['n','edges','source','destination'],[[3,[[0,1],[1,2],[2,0]],0,2],[6,[[0,1],[0,2],[3,5],[5,4],[4,3]],0,5]],[[1,[],0,0],[4,[[0,1]],0,3]],[1500,[[i,i+1] for i in range(1499)],0,1499],valid_path,['1 <= n <= 100000','0 <= edges.length <= 200000','source and destination are valid node indices.'],'False')
add('easy-trees-same-tree','Same Tree','easy','trees','Two binary trees are given as level-order arrays with null gaps. Return true if their structure and values match.',['p','q'],[[[1,2,3],[1,2,3]],[[1,2],[1,None,2]]],[[[],[]],[[1,2,1],[1,1,2]]],[[i for i in range(1023)],[i for i in range(1023)]],same_tree,['0 <= p.length, q.length <= 1023','null denotes an absent node.'],'False')
add('easy-trees-min-depth','Minimum Depth of Binary Tree','easy','trees','The tree is a level-order array with null gaps. Return the number of nodes on the shortest root-to-leaf path; return 0 for an empty tree.',['root'],[[[3,9,20,None,None,15,7]],[[2,None,3,None,None,None,4]]],[[[]],[[1]]],[[1]*1023],min_depth,['0 <= root.length <= 1023','null denotes an absent node.'],'0')

existing_descriptions = {
    'easy-arrays-two-sum': 'Given an array of integers nums and an integer target, find two distinct indices whose values add to target. Return their indices in ascending order. Exactly one answer exists.',
    'easy-strings-palindrome': 'Given a string s, keep only its alphanumeric characters and compare them without regard to case. Return true if the resulting string reads the same forward and backward.',
    'easy-math-fizz-buzz-count': 'Given a positive integer n, count the integers from 1 through n that are divisible by 3 or by 5. Count a number divisible by both only once.',
    'medium-arrays-longest-streak': 'Given an array nums of daily score changes, choose one nonempty contiguous subarray. Return the largest sum that any such streak can produce.',
    'medium-strings-group-anagrams': 'Given an array of lowercase words, words belong to the same group when they contain the same characters with the same counts. Return the number of distinct anagram groups.',
    'medium-trees-level-sum': 'A binary tree is represented by level-order values with null entries for missing nodes. Return the one-based level whose node values have the largest sum.',
    'medium-graphs-island-count': 'Given a grid of 0s and 1s, count groups of connected land cells. Land cells connect only to horizontal or vertical neighbors.',
    'hard-dp-coin-routes': 'Given coin denominations and a target, return how many combinations make the target exactly. You may use each denomination repeatedly; changing the order does not make a new combination.',
    'hard-graphs-shortest-signal': 'There are n nodes labeled from 1 to n. Each directed edge contains a source, destination, and positive travel time. A signal starts at start; return the time when every node has received it, or -1 if a node cannot be reached.',
    'hard-math-prime-window': 'Given a maximum value n and inclusive range queries [left, right], return the number of prime integers in each range in query order.',
    'easy-arrays-merge-tracks': 'Given two arrays a and b sorted in nondecreasing order, return one sorted array containing every value from both inputs, including duplicates.',
    'easy-strings-first-unique': 'Given a string s, return the zero-based index of its first character that occurs exactly once. Return -1 when no character is unique.',
    'easy-trees-max-depth': 'A binary tree is represented by level-order values with null entries for missing nodes. Return the number of nodes along the longest root-to-leaf path; return 0 for an empty tree.',
    'medium-arrays-product-signal': 'Given an integer array nums, return an array answer where answer[i] is the product of every value in nums except nums[i]. Preserve the original element order.',
    'medium-graphs-course-order': 'There are n courses numbered from 0 to n-1. Each prerequisite pair [course, required] means required must be finished first. Return true if every course can be finished.',
    'medium-dp-climb-routes': 'You are climbing n steps and may take either one or two steps at a time. Return the number of distinct sequences of moves that reach the top.',
    'medium-math-subarray-divisible': 'Given an integer array nums and a positive integer k, count the nonempty contiguous subarrays whose sum is divisible by k.',
    'hard-trees-path-sum': 'A binary tree is represented by level-order values with null entries for missing nodes. A path follows parent-child edges without repeating a node and may start and end anywhere. Return the largest path sum.',
    'hard-dp-edit-distance': 'Given strings word1 and word2, return the fewest single-character insertions, deletions, or replacements required to turn word1 into word2.',
    'hard-strings-min-window': 'Given strings s and t, return the shortest contiguous substring of s containing every character of t with at least its required count. Return an empty string if no such window exists.',
}

existing_constraints = {
    'easy-arrays-two-sum':['2 <= nums.length <= 10000','Exactly one pair adds to target.','Return the pair of indices in ascending order.'],
    'easy-strings-palindrome':['0 <= s.length <= 200000','Ignore case and all nonalphanumeric characters.'],
    'easy-math-fizz-buzz-count':['1 <= n <= 1000000000','Count numbers divisible by 3 or 5 once.'],
    'medium-arrays-longest-streak':['1 <= nums.length <= 100000','-10000 <= nums[i] <= 10000','The selected streak must contain at least one value.'],
    'medium-strings-group-anagrams':['0 <= words.length <= 10000','Words contain lowercase English letters.','Return the number of groups, not the groups themselves.'],
    'medium-trees-level-sum':['1 <= root.length <= 1023','null denotes an absent node.','The root is level 1.'],
    'medium-graphs-island-count':['1 <= grid.length, grid[i].length <= 300','Cells contain 0 for water or 1 for land.','Only horizontal and vertical neighbors connect.'],
    'hard-dp-coin-routes':['1 <= coins.length <= 100','0 <= target <= 5000','Coin order does not matter and denominations may be reused.'],
    'hard-graphs-shortest-signal':['1 <= n <= 100','Edges are directed and have positive travel time.','Return -1 when any node is unreachable.'],
    'hard-math-prime-window':['2 <= n <= 1000000','Each query [left, right] uses inclusive bounds.'],
    'easy-arrays-merge-tracks':['0 <= a.length, b.length <= 100000','Both input arrays are sorted.'],
    'easy-strings-first-unique':['0 <= s.length <= 100000','Return -1 if every character repeats.'],
    'easy-trees-max-depth':['0 <= root.length <= 1023','null denotes an absent node.'],
    'medium-arrays-product-signal':['2 <= nums.length <= 100000','Return one product for each index, excluding that value.'],
    'medium-graphs-course-order':['1 <= n <= 1000','Prerequisites are directed pairs of valid course indices.','Return true when a complete ordering exists.'],
    'medium-dp-climb-routes':['1 <= n <= 45','You may climb one or two steps at a time.'],
    'medium-math-subarray-divisible':['1 <= nums.length <= 100000','1 <= k <= 10000','Count contiguous, nonempty subarrays.'],
    'hard-trees-path-sum':['1 <= root.length <= 1023','null denotes an absent node.','A path may start and end at any nodes.'],
    'hard-dp-edit-distance':['0 <= word1.length, word2.length <= 500','Allowed operations are insert, delete, and replace.'],
    'hard-strings-min-window':['1 <= s.length <= 100000','1 <= t.length <= 10000','Character counts in t must all appear in the window.'],
}

assert len(questions)==50,(len(questions),len(tests))
assert len(tests)==50
for q in questions:
    assert q['id'] in tests
    assert all(tests[q['id']][group] for group in ('samples','hidden','efficiency'))
    if q['id'] in existing_constraints:
        q['description']=existing_descriptions[q['id']]
        q['constraints']=existing_constraints[q['id']]
(root/'questions.json').write_text(json.dumps(questions,indent=2,ensure_ascii=False)+'\n')
test_file.write_text(json.dumps(tests,separators=(',', ':'),ensure_ascii=False)+'\n')
print('Wrote',len(questions),'questions and',sum(len(group) for suite in tests.values() for group in suite.values()),'checkpoints')

