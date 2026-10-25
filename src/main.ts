import './fonts.css'

const MAX_BOUNCE_ANGLE: number = Math.PI / 3
const ROWS = 4
const COLS = 8
const BRICK_WIDTH = 54
const BRICK_HEIGHT = 16
const GAP = 4
const LEFT_OFFSET = 10
const TOP_OFFSET = 30
const POINTS_PER_BRICK = 10

interface Ball {               // Structure of ball
    x: number
    y: number
    radius: number
    dx: number
    dy: number
}

interface Rect {    // Structure for paddle and bricks
    x: number
    y: number
    height: number
    width: number
}

interface Paddle extends Rect {            // Structure of paddle
    speed: number
}

interface Brick extends Rect {
    alive: boolean
}

interface Game {
    ball: Ball
    paddle: Paddle
    bricks: Brick[]
    lives: number
    score: number
    state: GameState
}

type Direction = 'left' | 'right' | 'none'          // Paddle movement directions  

type BallResult = 'ok' | 'fell'

type GameState = 'start' | 'playing' | 'won' | 'lost'

function clamp(value: number, min: number, max: number): number {

    if (value < min) return min
    else if (value > max) return max
    else return value 
}

function createBall(canvasWidth: number, canvasHeight: number): Ball {
    const ball: Ball = {                 // ball values
        x: canvasWidth / 2 - 40,
        y: canvasHeight / 2 + canvasHeight / 4,
        radius: 8,
        dx: 250,
        dy: -250
    }

    return ball
}

function createPaddle(canvasWidth: number, canvasHeight: number): Paddle {
    const paddle: Paddle = {             // paddle values 
        x: canvasWidth / 2 - 40,
        y: canvasHeight - 20,
        height: 10,
        width: 80, 
        speed: 350
    }
    return paddle
}  

function createBricks(): Brick[] {

    const brickArr: Brick[] = []

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {

            const brick: Brick = {x: LEFT_OFFSET + c * (BRICK_WIDTH + GAP),
                                y: TOP_OFFSET + r * (BRICK_HEIGHT + GAP),
                                height: BRICK_HEIGHT,
                                width: BRICK_WIDTH,
                                alive: true
            }
        brickArr.push(brick)
            }
    }
    return brickArr
}

function BallHitsBrick(ball: Ball, rect: Rect): boolean {

    const nearestX = clamp(ball.x, rect.x, rect.x + rect.width)
    const nearestY = clamp(ball.y, rect.y, rect.y + rect.height)
    const distX = ball.x - nearestX
    const distY = ball.y - nearestY

    return distX * distX + distY * distY <= ball.radius * ball.radius
}

function handleBrickCollisions(ball: Ball, bricks: Brick[]): boolean {

    for (const brick of bricks) {

        if (brick.alive) {
            if (BallHitsBrick(ball, brick)){
                brick.alive = false
                
                if (ball.x < brick.x || ball.x > brick.x + brick.width) ball.dx *= -1
                else ball.dy *= -1
                return true
            }
        }
    } return false
}

function updateBall(ball: Ball, paddle: Paddle, dt: number, canvasHeight: number, canvasWidth: number): BallResult {
    ball.x += ball.dx * dt            // move ball forward by dx pixels (dt is used to
    ball.y += ball.dy * dt            // keep speed constant across different framerates of monitors)  

    // if ball direction is down and ball is between paddle width and ball bottom hits paddle top then bounce the ball up
    if ((ball.dy) > 0 && (ball.x >= paddle.x && ball.x <= (paddle.x + paddle.width)) && (ball.y + ball.radius) > (paddle.y) && (ball.y + ball.radius <= paddle.y + paddle.height)) {
        const speed = Math.hypot(ball.dx, ball.dy)
        const center = paddle.x + paddle.width / 2
        const offset = (ball.x - center) / (paddle.width / 2)
        const angle = offset * MAX_BOUNCE_ANGLE
        ball.dx = speed * Math.sin(angle)
        ball.dy = speed * -Math.cos(angle)
        ball.y = paddle.y - ball.radius
    }
    if (ball.x - ball.radius < 0) {
        ball.dx = Math.abs(ball.dx)
        ball.x = ball.radius
    }

    else if ((ball.x + ball.radius) > canvasWidth) {
        ball.dx = -1 * Math.abs(ball.dx) // change ball direction when hitting left | right wall  
        ball.x = canvasWidth - ball.radius
    }

    if ((ball.y - ball.radius) < 0) {
        ball.dy = Math.abs(ball.dy)   // change ball direction when hitting Top wall
        ball.y = ball.radius
    }

    if ((ball.y + ball.radius) > canvasHeight) 
        return 'fell'

    return 'ok'
}

function updatePaddle(paddle: Paddle, direction: Direction,  dt: number, canvasWidth: number): void {
    
    // move paddle left and right but within canvas boundary
    if (direction === 'left') {
        paddle.x -= paddle.speed * dt
        paddle.x = Math.max(paddle.x, 0)
    }
    else if (direction === 'right') {
        paddle.x += paddle.speed * dt
        paddle.x = Math.min(canvasWidth - paddle.width, paddle.x)
    }
}

function getDirection(keys: Set<string>): Direction {

    const leftKey = (keys.has("ArrowLeft") || keys.has("KeyA"))       // check if left key or a is pressed
    const rightKey = (keys.has("ArrowRight") || keys.has("KeyD"))     // check if right key or d is pressed   

    if (leftKey && !rightKey) return "left"                           
    else if (rightKey && !leftKey) return "right"
    else return "none"                                                // if both left and right keys are pressed then do nothing
}


function allBrickGone(bricks: Brick[]): boolean {
    return bricks.every(brick =>brick.alive === false )
}

function draw(ctx: CanvasRenderingContext2D, game: Game): void {

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)       // clear previous drawing on canvas
    ctx.beginPath()                                                // start drawing

    if (game.state !== 'playing') {

        ctx.strokeStyle = 'yellow'
        ctx.strokeRect(15, 15, ctx.canvas.width - 30, ctx.canvas.height- 30)

        ctx.fillStyle = 'yellow'
        ctx.font = '35px apple chancery, Z003, Lucida Calligraphy'
        ctx.textAlign = 'center'
        ctx.fillText('Brick-Break', ctx.canvas.width / 2, 80)

        if (game.state === 'start') {
            ctx.fillStyle = 'white'
            ctx.font = '20px apple chancery, Z003, Lucida Calligraphy'
            ctx.textAlign = 'center'
            ctx.fillText('Press Enter to play', ctx.canvas.width / 2, ctx.canvas.height / 2)
        }
        
        else if (game.state === 'lost' || game.state === 'won') {
            ctx.fillStyle = 'white'
            ctx.font = '30px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(`You ${game.state}`, ctx.canvas.width / 2, ctx.canvas.height / 2)

            ctx.fillStyle = 'white'
            ctx.font = '12px apple chancery, Z003, Lucida Calligraphy'
            ctx.textAlign = 'center'
            ctx.fillText(`Press Enter to restart`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 20)

            
            ctx.fillStyle = 'cyan'
            ctx.font = '30px apple chancery, Z003, Lucida Calligraphy'
            ctx.textAlign = 'center'
            ctx.fillText(`Your Score: ${game.score}`, ctx.canvas.width / 2, ctx.canvas.height - 80)
            
        }
    }

    else if (game.state === 'playing') {
        ctx.arc(game.ball.x, game.ball.y, game.ball.radius, 0, Math.PI * 2)           // create a ball 
        ctx.fillStyle = "white"                                        // add white color to ball
        ctx.fill()

        ctx.fillStyle = "darkorange"                                   // add dark orange to paddle
        ctx.fillRect(game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height)  // create the paddle

        for (const brick of game.bricks) {
            if (brick.alive) { 
                ctx.fillStyle = 'red'
                ctx.fillRect(brick.x, brick.y, brick.width ,brick.height)
            }
        }

        ctx.fillStyle = 'lightblue'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(`Lives: ${game.lives}`, 10, 15)

        ctx.font = '10px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillStyle = 'lightgreen'
        ctx.fillText(`Score: ${game.score}`, ctx.canvas.width - 20, 15)
    }
}
function setGame(canvasWidth: number, canvasHeight: number) {

    const game: Game = {
        ball: createBall(canvasWidth, canvasHeight),
        paddle: createPaddle(canvasWidth, canvasHeight),
        bricks: createBricks(),
        lives: 3,
        score: 0,
        state: 'start'
    }
    return game
}

function startGame(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {

    let game = setGame(canvas.width, canvas.height)

    const keys = new Set<string>()       // set that holds which keys was pressed

    window.addEventListener("keydown", (e) => {     // check which key is pressed
        keys.add(e.code)
        }
    )

    window.addEventListener("keyup", (e) => {       // check which key is released
        keys.delete(e.code)
        }
    )

    let last = 0 
    function loop(time: number) {        // function to run game infinitely 
        
        const dt = Math.min(0.05, (time - last) / 1000)      // calculate time since last frame (prevents ball from moving fast in faster hz monitor)
        last = time

        switch (game.state) {
        
            case 'start':
                if (keys.has('Enter')) game.state = 'playing'
                break
        
            case 'playing':

                const result = updateBall(game.ball, game.paddle, dt, ctx.canvas.height, ctx.canvas.width)      // update ball position
                
                if (result === 'fell' && game.lives > 0) {
                    game.lives -= 1

                    if (game.lives > 0) {
                        game.ball = createBall(canvas.width, canvas.height)
                    } else game.state = 'lost'
                }

                const hit = handleBrickCollisions(game.ball, game.bricks)

                if (hit) game.score += POINTS_PER_BRICK

                const bricksGone = allBrickGone(game.bricks)

                if (bricksGone) game.state = 'won'

                const direction = getDirection(keys)                    // calculate key pressed

                updatePaddle(game.paddle, direction, dt, ctx.canvas.width)   // move paddle left or right based on key pressed 
                break
            case 'won':
            case 'lost':
                if (keys.has('Enter')) {
                    game = setGame(canvas.width, canvas.height)
            }
        }
    

        draw(ctx, game)         // draw the ball, paddle and bricks 
        requestAnimationFrame(loop)     // animate next frame
    }

    requestAnimationFrame(loop)     // display animated frame
}

const canvas = document.getElementById('game')
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Canvas not found")

const ctx = canvas.getContext('2d')
if (!ctx) throw new Error("ctx not found")

startGame(canvas, ctx)     // run the game