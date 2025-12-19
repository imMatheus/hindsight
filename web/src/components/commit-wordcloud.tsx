import type { CommitStats } from '@/types'

interface CommitWordCloudProps {
  commits: CommitStats[]
}

export const CommitWordCloud: React.FC<CommitWordCloudProps> = ({
  commits,
}) => {
  const wordCounts = { wtf: 0, fixme: 0, todo: 0, hack: 0, test: 0, please: 0 }

  for (const commit of commits) {
    const message = commit.message.toLowerCase().split(' ')
    if (message.includes('wtf')) {
      wordCounts.wtf++
    } else if (message.includes('fixme')) {
      wordCounts.fixme++
    } else if (message.includes('todo')) {
      wordCounts.todo++
    } else if (message.includes('hack')) {
      wordCounts.hack++
    } else if (message.includes('test')) {
      wordCounts.test++
    } else if (message.includes('please')) {
      wordCounts.please++
    }
  }

  return (
    <div className="">
      <h3 className="mb-4 text-6xl font-black">Bänger commits!</h3>
      <p className="mb-8 text-xl font-semibold">
        coming up with commit messages is hard, you did not do great :){' '}
      </p>

      <div className="text-obsidian-field grid grid-cols-2 gap-2">
        <div className="bg-alloy-ember flex-1 rounded-full px-10 py-6">
          <p className="text-5xl font-bold">{wordCounts.wtf} "WTF"</p>
          <p className="text-xl font-bold">
            {wordCounts.wtf > 0
              ? 'me when i give up'
              : 'swearing is rude, so makes sense tbh'}
          </p>
        </div>

        <div className="bg-pinky flex-1 rounded-full px-10 py-6">
          <p className="text-5xl font-bold">{wordCounts.fixme} "FIXME"</p>
          <p className="text-xl font-bold">
            {wordCounts.fixme > 0
              ? 'we all know none of these where fixed'
              : 'someone is NOT a perfectionist'}
          </p>
        </div>

        <div className="bg-ion-drift flex-1 rounded-full px-10 py-6">
          <p className="text-5xl font-bold">{wordCounts.todo} "TODO"</p>
          <p className="text-xl font-bold">
            {wordCounts.todo > 0 ? (
              <>
                how about you <i className="font-black">do</i> some pushups{' '}
              </>
            ) : (
              'someone is NOT a procrastinator'
            )}
          </p>
        </div>

        <div className="bg-core-flux flex-1 rounded-full px-10 py-6">
          <p className="text-5xl font-bold">{wordCounts.hack} "HACK"</p>
          <p className="text-xl font-bold">
            {wordCounts.hack > 0
              ? '"it works, i sweeear" ahh'
              : 'ok MR.perfectcodesoyboy'}
          </p>
        </div>

        <div className="bg-polar-sand flex-1 rounded-full px-10 py-6">
          <p className="text-5xl font-bold">{wordCounts.test} "TEST"</p>
          <p className="text-xl font-bold">
            this SCREAMS "i dont trust my code"
          </p>
        </div>

        <div className="bg-alloy-ember flex-1 rounded-full px-10 py-6">
          <p className="text-5xl font-bold">{wordCounts.please} "PLEASE"</p>
          <p className="text-xl font-bold">
            {wordCounts.please > 0
              ? '"whats the magic word" ahh commits'
              : 'someone is not polite lmao'}
          </p>
        </div>
      </div>
    </div>
  )
}

// import React, { useLayoutEffect, useMemo, useState } from 'react'
// import { Text } from '@visx/text'
// import { scaleLog } from '@visx/scale'
// import { Wordcloud } from '@visx/wordcloud'
// import type { CommitStats } from '@/types'

// interface CommitWordCloudProps {
//   stats: CommitStats[]
//   width?: number
//   height?: number
// }

// export interface WordData {
//   text: string
//   value: number
// }

// function extractWords(messages: string[]): WordData[] {
//   const freqMap: Record<string, number> = {}

//   for (const message of messages) {
//     // Split by whitespace and punctuation, convert to lowercase
//     const words = message
//       .toLowerCase()
//       .replace(/[^\w\s]/g, ' ')
//       .split(/\s+/)
//       .filter((word) => word.length > 2 && !stopWords.has(word))

//     for (const word of words) {
//       freqMap[word] = (freqMap[word] || 0) + 1
//     }
//   }

//   // Convert to array and filter out words that appear only once
//   return Object.entries(freqMap)
//     .filter(([_, count]) => count > 1)
//     .map(([word, count]) => ({ text: word, value: count }))
//     .sort((a, b) => b.value - a.value)
//   // .slice(0, 2090) // Limit to top 100 words
// }

// const colors = [
//   'var(--core-flux)', // core-flux
//   'var(--ion-drift)', // ion-drift
//   'var(--pinky)', // pinky
//   'var(--polar-sand)', // polar-sand
//   'var(--alloy-ember)', // alloy-ember
// ]

// const fixedValueGenerator = () => 0.5

// export const CommitWordCloud: React.FC<CommitWordCloudProps> = ({ stats }) => {
//   //   const [documentSize, setDocumentSize] = useState(() =>
//   //     typeof window !== 'undefined'
//   //       ? {
//   //           x: document.documentElement.clientWidth,
//   //           y: document.documentElement.clientHeight,
//   //         }
//   //       : { x: 0, y: 0 }
//   //   )

//   //   useLayoutEffect(() => {
//   //     const handleResize = (e: UIEvent) => {
//   //       // did you know that video src causes an unavoidable resize event even if sizes are determined?
//   //       // only care about viewport-level changes here
//   //       if (e.target !== window && e.target !== window.visualViewport) return
//   //       setDocumentSize({
//   //         x: document.documentElement.clientWidth,
//   //         y: document.documentElement.clientHeight,
//   //       })
//   //     }

//   //   window.addEventListener('resize', handleResize, true)
//   //     return () => {
//   //       window.removeEventListener('resize', handleResize, true)
//   //     }
//   //   }, [])

//   const width = 800
//   const height = 400
//   //   const width = Math.min(documentSize.x, 800)
//   //   const height = Math.min(documentSize.y, 400)

//   const words = useMemo(() => {
//     const messages = stats.map((stat) => stat.message)
//     return extractWords(messages)
//   }, [stats])

//   const fontScale = useMemo(
//     () =>
//       words.length > 0
//         ? scaleLog({
//             domain: [
//               Math.min(...words.map((w) => w.value)),
//               Math.max(...words.map((w) => w.value)),
//             ],
//             range: [14, 60],
//           })
//         : null,
//     [words]
//   )

//   const fontSizeSetter = (datum: WordData) =>
//     fontScale ? fontScale(datum.value) : 14

//   if (words.length === 0) {
//     return null
//   }

//   return null

//   return (
//     <div className="my-20">
//       <h3 className="mb-4 text-6xl font-black">Commit Message Word Cloud</h3>
//       <p className="mb-8 text-xl font-semibold">
//         The most common words found in commit messages
//       </p>
//       <div className="flex justify-center">
//         <div className="wordcloud">
//           <Wordcloud
//             words={words}
//             width={width}
//             height={height}
//             fontSize={fontSizeSetter}
//             font="Plus Jakarta Sans"
//             padding={2}
//             spiral="archimedean"
//             rotate={0}
//             random={fixedValueGenerator}
//           >
//             {(cloudWords) =>
//               cloudWords.map((w, i) => (
//                 <Text
//                   key={w.text}
//                   fill={colors[i % colors.length]}
//                   textAnchor="middle"
//                   transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
//                   fontSize={w.size}
//                   fontFamily={w.font}
//                   style={{
//                     cursor: 'default',
//                     userSelect: 'none',
//                     // fontWeight: 'medium',
//                   }}
//                 >
//                   {w.text}
//                 </Text>
//               ))
//             }
//           </Wordcloud>
//         </div>
//       </div>
//     </div>
//   )
// }

// // Common stop words to filter out
// const stopWords = new Set([
//   'the',
//   'a',
//   'an',
//   'and',
//   'or',
//   'but',
//   'in',
//   'on',
//   'at',
//   'to',
//   'for',
//   'of',
//   'with',
//   'by',
//   'from',
//   'as',
//   'is',
//   'was',
//   'are',
//   'were',
//   'be',
//   'been',
//   'being',
//   'have',
//   'has',
//   'had',
//   'do',
//   'does',
//   'did',
//   'will',
//   'would',
//   'should',
//   'could',
//   'may',
//   'might',
//   'must',
//   'can',
//   'this',
//   'that',
//   'these',
//   'those',
//   'i',
//   'you',
//   'he',
//   'she',
//   'it',
//   'we',
//   'they',
//   'me',
//   'him',
//   'her',
//   'us',
//   'them',
//   'my',
//   'your',
//   'his',
//   'her',
//   'its',
//   'our',
//   'their',
//   'fix',
//   'fixes',
//   'fixed',
//   'update',
//   'updates',
//   'updated',
//   'add',
//   'adds',
//   'added',
//   'remove',
//   'removes',
//   'removed',
//   'change',
//   'changes',
//   'changed',
//   'refactor',
//   'refactors',
//   'refactored',
//   'merge',
//   'merges',
//   'merged',
//   'commit',
//   'commits',
//   'committed',
// ])
