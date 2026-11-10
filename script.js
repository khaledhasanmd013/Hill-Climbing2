const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let coinsCount = 0;
let fuel = 100;
let distance = 0;
let gameOver = false;

// প্রো কার ও চাকা ফিজিক্স অবজেক্ট
const car = {
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    angle: 0,
    vAngle: 0,
    width: 60,
    height: 25,
    mass: 2,
    power: 0.35,
    brakePower: 0.2,
    gravity: 0.3,
    friction: 0.98,
    // হুইল পজিশন
    wheels: [
        { offsetX: -22, offsetY: 15, radius: 11, suspension: 0, vy: 0 },
        { offsetX: 22, offsetY: 15, radius: 11, suspension: 0, vy: 0 }
    ]
};

// কী-বোর্ড এবং অনস্ক্রিন কন্ট্রোল স্টেট
const keys = { right: false, left: false };

window.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
});
window.addEventListener("keyup", e => {
    if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
});

// টাচ ও মাউস কন্ট্রোল কানেকশন
document.getElementById("gas-btn").addEventListener("mousedown", () => keys.right = true);
document.getElementById("gas-btn").addEventListener("mouseup", () => keys.right = false);
document.getElementById("brake-btn").addEventListener("mousedown", () => keys.left = true);
document.getElementById("brake-btn").addEventListener("mouseup", () => keys.left = false);

// উন্নত পারফেক্ট পাহাড়ি রাস্তা ম্যাপিং (একাধিক ফ্রিকোয়েন্সি ওয়েভ)
function getTerrainHeight(x) {
    return Math.sin(x * 0.002) * 130 + 
           Math.sin(x * 0.007) * 45 + 
           Math.cos(x * 0.001) * 80 + 350;
}

// কয়েন ও ফুয়েল ক্যানিস্টার জেনারেটর
let collectables = [];
for (let i = 400; i < 25000; i += 250) {
    let type = (i % 750 === 0) ? "fuel" : "coin";
    collectables.push({
        x: i,
        y: getTerrainHeight(i) - 35,
        type: type,
        collected: false
    });
}

// স্মোক পার্টিকেল সিস্টেম
let particles = [];

function update() {
    if (gameOver) return;

    // ফুয়েল লজিক
    if (keys.right) {
        fuel -= 0.035;
        if (fuel <= 0) { fuel = 0; car.power = 0.05; }
    }
    if (fuel <= 0 && keys.right) car.power = 0; else car.power = 0.35;

    // কার এক্সিলারেশন ও ফিজিক্স
    if (keys.right) car.vx += car.power * Math.cos(car.angle);
    if (keys.left) car.vx -= car.brakePower;

    car.vx *= car.friction;
    car.vy += car.gravity;

    car.x += car.vx;
    car.y += car.vy;

    // দূরত্ব হিসাব
    distance = Math.floor(car.x / 10);

    // চাকা এবং পাহাড়ের উচ্চতা ক্যালকুলেশন (সাসপেনশন ইন্টিগ্রেশন)
    car.wheels.forEach(wheel => {
        let wx = car.x + wheel.offsetX * Math.cos(car.angle) - wheel.offsetY * Math.sin(car.angle);
        let wy = car.y + wheel.offsetX * Math.sin(car.angle) + wheel.offsetY * Math.cos(car.angle);
        
        let groundY = getTerrainHeight(wx);
        
        if (wy + wheel.radius > groundY) {
            let penetration = (wy + wheel.radius) - groundY;
            car.y -= penetration * 0.5;
            car.vy = Math.min(car.vy, 0);
            
            // পাহাড়ের ঢাল অনুযায়ী রোটেশন অ্যাডজাস্টমেন্ট
            let nextGroundY = getTerrainHeight(wx + 5);
            let slopeAngle = Math.atan2(nextGroundY - groundY, 5);
            car.angle += (slopeAngle - car.angle) * 0.25;

            // চাকার নিচে ধূলিকণা বা স্মোক তৈরি
            if (Math.abs(car.vx) > 2 && Math.random() < 0.3) {
                particles.push({ x: wx, y: groundY, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, alpha: 1 });
            }
        }
    });

    // বাতাসে রোটেট করার ক্ষমতা
    if (keys.right && car.y < getTerrainHeight(car.x) - 40) car.angle += 0.02;
    if (keys.left && car.y < getTerrainHeight(car.x) - 40) car.angle -= 0.02;

    // উল্টে গেলে গেম ওভার
    if (Math.abs(car.angle) > Math.PI * 0.75) {
        gameOver = true;
        document.getElementById("final-score").innerText = distance;
        document.getElementById("game-over-screen").classList.remove("hidden");
    }

    // কালেকশন চেক (কয়েন ও ফুয়েল)
    collectables.forEach(item => {
        if (!item.collected) {
            let distToItem = Math.hypot(car.x - item.x, car.y - item.y);
            if (distToItem < 35) {
                item.collected = true;
                if (item.type === "coin") {
                    coinsCount += 100;
                } else if (item.type === "fuel") {
                    fuel = Math.min(100, fuel + 35);
                }
            }
        }
    });

    // পার্টিকেল আপডেট
    particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        if (p.alpha <= 0) particles.splice(index, 1);
    });

    // UI আপডেট
    document.getElementById("coins").innerText = coinsCount;
    document.getElementById("score").innerText = distance;
    document.getElementById("fuel-bar").style.width = fuel + "%";

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // ক্যামেরা প্যানিং (গাড়ির সাথে স্ক্রিন মুভ করবে)
    ctx.translate(-car.x + 250, 0);

    // ১. ব্যাকগ্রাউন্ড পাহাড় ও সিনারি
    drawBackgroundScenery();

    // ২. মেইন পাহাড়ি রাস্তা
    drawTerrain();

    // ৩. কয়েন ও ফুয়েল ক্যানিস্টার রেন্ডার
    collectables.forEach(item => {
        if (!item.collected && item.x > car.x - 300 && item.x < car.x + canvas.width + 300) {
            ctx.beginPath();
            if (item.type === "coin") {
                ctx.fillStyle = "#f1c40f";
                ctx.arc(item.x, item.y, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#d4ac0d";
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.fillStyle = "#e74c3c";
                ctx.fillRect(item.x - 8, item.y - 12, 16, 22);
                ctx.fillStyle = "#fff";
                ctx.fillRect(item.x - 4, item.y - 6, 8, 10);
            }
        }
    });

    // ৪. স্মোক পার্টিকেল রেন্ডার
    particles.forEach(p => {
        ctx.fillStyle = `rgba(200, 200, 200, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // ৫. প্রিমিয়াম ডিজাইন কার রেন্ডার
    drawCar();

    ctx.restore();
}

function drawBackgroundScenery() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    for (let i = -5; i < 40; i++) {
        let bx = i * 500;
        ctx.beginPath();
        ctx.arc(bx + 150, 120, 50, 0, Math.PI * 2);
        ctx.arc(bx + 190, 100, 65, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawTerrain() {
    ctx.beginPath();
    let startX = car.x - 300;
    let endX = car.x + canvas.width + 400;
    
    ctx.moveTo(startX, canvas.height);
    for (let x = startX; x < endX; x += 15) {
        ctx.lineTo(x, getTerrainHeight(x));
    }
    ctx.lineTo(endX, canvas.height);
    
    let gradient = ctx.createLinearGradient(0, 150, 0, canvas.height);
    gradient.addColorStop(0, "#27ae60");
    gradient.addColorStop(0.3, "#2ecc71");
    gradient.addColorStop(1, "#1e8449");
    
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
}

function drawCar() {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // গাড়ির ছাদ ও বডি (রেট্রো জিপ স্টাইল)
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(-car.width / 2, -car.height - 10, car.width, car.height);
    
    // কেবিন বা ছাদ অংশ
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(-car.width / 2 + 8, -car.height - 24, car.width - 24, 16);

    // উইন্ডস্ক্রিন
    ctx.fillStyle = "#d4efdf";
    ctx.fillRect(-car.width / 2 + 12, -car.height - 21, 14, 10);

    // ড্রাইভারের মাথা
    ctx.fillStyle = "#f39c12";
    ctx.beginPath();
    ctx.arc(2, -car.height - 14, 5, 0, Math.PI * 2);
    ctx.fill();

    // চাকা দুটি ড্র করা
    car.wheels.forEach(wheel => {
        ctx.save();
        ctx.translate(wheel.offsetX, wheel.offsetY);
        
        // টায়ার
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(0, 0, wheel.radius, 0, Math.PI * 2);
        ctx.fill();

        // রিম
        ctx.fillStyle = "#95a5a6";
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });

    ctx.restore();
}

function restartGame() {
    car.x = 100;
    car.y = 100;
    car.vx = 0;
    car.vy = 0;
    car.angle = 0;
    fuel = 100;
    coinsCount = 0;
    distance = 0;
    gameOver = false;
    collectables.forEach(item => item.collected = false);
    document.getElementById("game-over-screen").classList.add("hidden");
    update();
}

// গেম রান শুরু করুন
update();
