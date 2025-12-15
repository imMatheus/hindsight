import React from 'react'

export const LoadingAnimation: React.FC = ({}) => {
  const animationDuration = 2100
  return (
    <>
      <style>{`
        @keyframes loader-1 {
            0%, 50%, 100% { width: 50%; height: 50%; }
            25% { width: 33%; height: 50%; }
            75% { width: 50%; height: 67%; }
        }
        @keyframes loader-2 {
            0%, 50%, 100% { width: 50%; height: 50%; }
            25% { width: 67%; height: 50%; }
            75% { width: 50%; height: 33%; }
        }
        `}</style>
      <div className="">
        <div className="relative h-52 w-52">
          <div
            className="bg-core-flux absolute top-0 left-0 size-1/2 rounded-full"
            style={{ animation: `loader-1 ${animationDuration}ms infinite` }}
          />
          <div
            className="bg-pinky absolute top-0 right-0 size-1/2 rounded-full"
            style={{ animation: `loader-2 ${animationDuration}ms infinite` }}
          />
          <div
            className="bg-ion-drift absolute bottom-0 left-0 size-1/2 rounded-full"
            style={{ animation: `loader-2 ${animationDuration}ms infinite` }}
          />
          <div
            className="bg-polar-sand absolute right-0 bottom-0 size-1/2 rounded-full"
            style={{ animation: `loader-1 ${animationDuration}ms infinite` }}
          />
        </div>
        <p className="pt-2 text-center text-sm font-medium">
          cranking the numbers...
        </p>
      </div>
    </>
  )
}
