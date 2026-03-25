import { useState, useEffect, useRef, useCallback } from 'react'
import { Car, User, ShieldAlert, Trophy, Play, RotateCcw, Heart, Camera, Zap, Flag, Square } from 'lucide-react'

// Game Constants (Scratch-like Stage)
const STAGE_WIDTH = 480
const STAGE_HEIGHT = 360
const CAR_WIDTH = 50
const CAR_HEIGHT = 35
const PASSENGER_SIZE = 30
const OBSTACLE_SIZE = 35
const CAMERA_SIZE = 40
const LANE_HEIGHT = STAGE_HEIGHT / 3
const INITIAL_SPEED = 4
const SPEED_INCREMENT = 0.0008
const MAX_SAFE_SPEED = 10

type Entity = {
  id: number
  x: number
  y: number
  type: 'PASSENGER' | 'OBSTACLE' | 'CAMERA'
}

function App() {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START')
  const [score, setScore] = useState(0)
  const [passengersCollected, setPassengersCollected] = useState(0)
  const [health, setHealth] = useState(3)
  const [carY, setCarY] = useState(STAGE_HEIGHT / 2 - CAR_HEIGHT / 2)
  const [entities, setEntities] = useState<Entity[]>([])
  const [speed, setSpeed] = useState(INITIAL_SPEED)
  const [distance, setDistance] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)

  const requestRef = useRef<number>()
  const lastTimeRef = useRef<number>()
  const nextSpawnRef = useRef<number>(0)
  const entityIdCounter = useRef<number>(0)

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'PLAYING') return
    const rect = e.currentTarget.getBoundingClientRect()
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    // Scale the movement to the stage size
    const relativeY = (clientY - rect.top) * (STAGE_HEIGHT / rect.height)
    const newY = Math.max(0, Math.min(STAGE_HEIGHT - CAR_HEIGHT, relativeY - CAR_HEIGHT / 2))
    setCarY(newY)
  }, [gameState])

  const startGame = () => {
    setGameState('PLAYING')
    setScore(0)
    setPassengersCollected(0)
    setHealth(3)
    setCarY(STAGE_HEIGHT / 2 - CAR_HEIGHT / 2)
    setEntities([])
    setSpeed(INITIAL_SPEED)
    setDistance(0)
    setIsFlashing(false)
    lastTimeRef.current = performance.now()
    nextSpawnRef.current = 0
  }

  const stopGame = () => {
    setGameState('START')
    if (requestRef.current) cancelAnimationFrame(requestRef.current)
  }

  const updateGame = useCallback((time: number) => {
    if (gameState !== 'PLAYING') return

    const deltaTime = time - (lastTimeRef.current || time)
    lastTimeRef.current = time

    // Update speed and distance
    setSpeed(s => s + SPEED_INCREMENT)
    setDistance(d => d + speed)

    // Move and filter entities
    setEntities(prevEntities => {
      const newEntities = prevEntities
        .map(e => ({ ...e, x: e.x - speed }))
        .filter(e => e.x > -100)

      // Collision Detection
      const carRect = { x: 40, y: carY, w: CAR_WIDTH, h: CAR_HEIGHT }
      
      return newEntities.filter(e => {
        const entityRect = { 
          x: e.x, 
          y: e.y, 
          w: e.type === 'PASSENGER' ? PASSENGER_SIZE : (e.type === 'CAMERA' ? CAMERA_SIZE : OBSTACLE_SIZE),
          h: e.type === 'PASSENGER' ? PASSENGER_SIZE : (e.type === 'CAMERA' ? CAMERA_SIZE : OBSTACLE_SIZE)
        }

        const isColliding = 
          carRect.x < entityRect.x + entityRect.w &&
          carRect.x + carRect.w > entityRect.x &&
          carRect.y < entityRect.y + entityRect.h &&
          carRect.y + carRect.h > entityRect.y

        if (isColliding) {
          if (e.type === 'PASSENGER') {
            setScore(s => s + 10)
            setPassengersCollected(p => p + 1)
            return false
          } else if (e.type === 'CAMERA') {
            if (speed > MAX_SAFE_SPEED) {
              setHealth(h => {
                if (h <= 1) {
                  setGameState('GAMEOVER')
                  return 0
                }
                return h - 1
              })
              setIsFlashing(true)
              setTimeout(() => setIsFlashing(false), 150)
              return false
            }
            return true
          } else {
            setHealth(h => {
              if (h <= 1) {
                setGameState('GAMEOVER')
                return 0
              }
              return h - 1
            })
            return false
          }
        }
        return true
      })
    })

    // Spawning
    if (time > nextSpawnRef.current) {
      const rand = Math.random()
      let type: 'PASSENGER' | 'OBSTACLE' | 'CAMERA' = 'PASSENGER'
      if (rand < 0.25) type = 'OBSTACLE'
      else if (rand < 0.4) type = 'CAMERA'
      
      const lane = Math.floor(Math.random() * 3)
      const size = type === 'PASSENGER' ? PASSENGER_SIZE : (type === 'CAMERA' ? CAMERA_SIZE : OBSTACLE_SIZE)
      const y = lane * LANE_HEIGHT + (LANE_HEIGHT / 2 - size / 2)
      
      setEntities(prev => [
        ...prev,
        {
          id: entityIdCounter.current++,
          x: STAGE_WIDTH + 50,
          y,
          type
        }
      ])
      
      nextSpawnRef.current = time + Math.random() * (1800 / (speed / 4)) + 600
    }

    requestRef.current = requestAnimationFrame(updateGame)
  }, [gameState, carY, speed])

  useEffect(() => {
    if (gameState === 'PLAYING') {
      requestRef.current = requestAnimationFrame(updateGame)
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [gameState, updateGame])

  return (
    <div className={`min-h-screen ${isFlashing ? 'bg-white' : 'bg-[#f0f0f0]'} flex flex-col items-center justify-center p-4 font-mono select-none overflow-hidden transition-colors duration-75`}>
      {/* Scratch Header */}
      <div className="w-full max-w-[480px] bg-[#4d97ff] p-3 flex justify-between items-center rounded-t-xl shadow-lg">
        <div className="flex gap-4">
          <button 
            onClick={startGame}
            className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${gameState === 'PLAYING' ? 'bg-green-600/50' : 'bg-[#00c853]'} shadow-inner`}
          >
            <Flag className="w-6 h-6 text-white fill-current" />
          </button>
          <button 
            onClick={stopGame}
            className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${gameState === 'START' ? 'bg-red-600/50' : 'bg-[#ff4c4c]'} shadow-inner`}
          >
            <Square className="w-6 h-6 text-white fill-current" />
          </button>
        </div>
        <div className="text-white font-bold text-lg tracking-wider">CARPOOL MANIA</div>
      </div>

      {/* Main Game Stage */}
      <div 
        className="w-full max-w-[480px] aspect-[4/3] bg-white relative overflow-hidden shadow-2xl border-x-4 border-b-4 border-[#4d97ff] cursor-crosshair"
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
      >
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center text-center p-8">
            <div className="bg-[#ffab19] p-4 rounded-3xl mb-4 border-4 border-[#cf8b17] animate-bounce">
              <Car className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-4xl font-black text-[#4d97ff] mb-2 uppercase italic">CARPOOL MANIA</h1>
            <p className="text-[#5c5c5c] font-bold mb-6 text-sm">CLICK THE GREEN FLAG TO START!</p>
            <div className="flex gap-4 text-[10px] font-bold uppercase text-[#4d97ff]">
              <div className="flex flex-col items-center"><User className="w-6 h-6 mb-1"/> +10 pts</div>
              <div className="flex flex-col items-center"><ShieldAlert className="w-6 h-6 mb-1 text-red-500"/> -1 hp</div>
              <div className="flex flex-col items-center"><Camera className="w-6 h-6 mb-1 text-[#ffab19]"/> Watch Speed!</div>
            </div>
          </div>
        )}

        {gameState === 'PLAYING' && (
          <>
            {/* Road lines - Scratch Style */}
            <div className="absolute inset-0 flex flex-col justify-around py-4">
              <div className="h-1.5 w-full bg-[#e0e0e0]" />
              <div className="h-1.5 w-full bg-[#e0e0e0]" />
            </div>

            {/* Scoreboard - Blocky Style */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <div className="bg-[#ffab19] px-3 py-1 rounded-lg border-2 border-[#cf8b17] text-white font-bold text-sm shadow-md flex items-center gap-2">
                <span className="text-xs opacity-80 uppercase">Score</span> {Math.floor(score + distance / 20)}
              </div>
              <div className="bg-[#4d97ff] px-3 py-1 rounded-lg border-2 border-[#3d7bcc] text-white font-bold text-sm shadow-md flex items-center gap-2">
                <span className="text-xs opacity-80 uppercase">Speed</span> {Math.floor(speed * 10)}
              </div>
            </div>

            {/* Health - Blocky Style */}
            <div className="absolute top-4 right-4 z-10 flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-6 h-6 rounded-md border-2 ${i < health ? 'bg-[#ff4c4c] border-[#cc3d3d]' : 'bg-gray-200 border-gray-300'} transition-colors shadow-sm`} />
              ))}
            </div>

            {/* Entities */}
            {entities.map(e => (
              <div
                key={e.id}
                className="absolute transition-transform"
                style={{ 
                  left: `${(e.x / STAGE_WIDTH) * 100}%`, 
                  top: e.y,
                  width: e.type === 'PASSENGER' ? PASSENGER_SIZE : (e.type === 'CAMERA' ? CAMERA_SIZE : OBSTACLE_SIZE),
                  height: e.type === 'PASSENGER' ? PASSENGER_SIZE : (e.type === 'CAMERA' ? CAMERA_SIZE : OBSTACLE_SIZE)
                }}
              >
                {e.type === 'PASSENGER' ? (
                  <User className="w-full h-full text-[#4d97ff] drop-shadow-md animate-pulse" />
                ) : e.type === 'CAMERA' ? (
                  <div className="relative flex flex-col items-center">
                    <div className="bg-[#ffab19] text-[6px] font-black px-1 rounded-sm text-white mb-0.5 shadow-sm">LIMIT {MAX_SAFE_SPEED * 10}</div>
                    <Camera className="w-full h-full text-[#ffab19] drop-shadow-md" />
                  </div>
                ) : (
                  <ShieldAlert className="w-full h-full text-[#ff4c4c] drop-shadow-md animate-bounce" />
                )}
              </div>
            ))}

            {/* Car */}
            <div 
              className="absolute left-[10%] transition-all duration-75 ease-out z-10"
              style={{ top: carY, width: CAR_WIDTH, height: CAR_HEIGHT }}
            >
              <Car className={`w-full h-full ${speed > MAX_SAFE_SPEED ? 'text-orange-500' : 'text-[#ffab19]'} drop-shadow-lg transition-colors`} />
              {/* Scratch style shadow */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-black/10 rounded-full blur-[1px]" />
            </div>
          </>
        )}

        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-[#ff4c4c]/90 z-20 flex flex-col items-center justify-center text-center p-8 animate-in zoom-in duration-300">
            <h2 className="text-5xl font-black text-white mb-4 uppercase italic tracking-tighter">BUSTED!</h2>
            <div className="bg-white p-6 rounded-3xl border-4 border-[#cc3d3d] shadow-xl">
              <p className="text-[#5c5c5c] font-black text-sm uppercase mb-1">Final Score</p>
              <p className="text-4xl font-black text-[#ffab19] mb-4">{Math.floor(score + distance / 20)}</p>
              <div className="flex gap-4">
                <div className="text-xs font-bold text-[#5c5c5c]"><User className="w-4 h-4 inline mr-1"/> {passengersCollected}</div>
                <div className="text-xs font-bold text-[#5c5c5c]"><Zap className="w-4 h-4 inline mr-1"/> {Math.floor(speed * 10)}km/h</div>
              </div>
            </div>
            <button 
              onClick={startGame}
              className="mt-6 bg-[#00c853] text-white px-8 py-3 rounded-full font-black text-xl border-4 border-[#00a344] hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* Instructions footer - Scratch Style */}
      <div className="w-full max-w-[480px] mt-4 p-4 bg-white rounded-xl shadow-md border-2 border-[#e0e0e0]">
        <h3 className="text-[#5c5c5c] font-black text-xs uppercase mb-2">Instructions:</h3>
        <p className="text-[#888888] text-[10px] leading-relaxed font-bold uppercase">
          Move your mouse to control the car. Pick up passengers for points. Don't hit the traffic. <span className="text-[#ffab19]">Slow down</span> for cameras if you're over the limit!
        </p>
      </div>

      <style>{`
        @font-face {
          font-family: 'Scratch';
          src: local('Helvetica Bold'), local('Arial Bold');
        }
        * { font-family: 'Scratch', sans-serif; }
      `}</style>
    </div>
  )
}

export default App
