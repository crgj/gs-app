import { invert4, rotate4, translate4 } from "./math-utils.js";

export class InputController {
    constructor(canvas, getViewMatrix, setViewMatrix) {
        this.canvas = canvas;
        this.getViewMatrix = getViewMatrix;
        this.setViewMatrix = setViewMatrix;

        this.activeKeys = [];
        this.down = 0;
        this.startX = 0;
        this.startY = 0;
        this.sensitivity = 3.0;  // mouse sensitivity
        this.moveSpeed = 0.05;   // movement speed

        this.registerEvents();
    }

    registerEvents() {
        window.addEventListener("keydown", (e) => {
            if (!this.activeKeys.includes(e.code)) this.activeKeys.push(e.code);
        });

        window.addEventListener("keyup", (e) => {
            this.activeKeys = this.activeKeys.filter((k) => k !== e.code);
        });

        window.addEventListener("blur", () => {
            this.activeKeys = [];
        });

        this.canvas.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.down = e.button === 0 ? 1 : 0;  // Left click
        });

        this.canvas.addEventListener("mouseup", () => {
            this.down = 0;
        });

        this.canvas.addEventListener("mousemove", (e) => {
            if (this.down !== 1) return;

            const dx = (e.clientX - this.startX) / innerWidth * this.sensitivity;
            const dy = (e.clientY - this.startY) / innerHeight * this.sensitivity;

            let inv = invert4(this.getViewMatrix());
            inv = rotate4(inv, dx, 0, 1, 0);     // yaw
            inv = rotate4(inv, -dy, 1, 0, 0);    // pitch

            this.setViewMatrix(invert4(inv));

            this.startX = e.clientX;
            this.startY = e.clientY;
        });

        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            const scale = e.deltaY * 10 / innerHeight;
            let inv = invert4(this.getViewMatrix());
            inv = translate4(inv, 0, 0, -scale);
            this.setViewMatrix(invert4(inv));
        }, { passive: false });
    }

    applyKeyboardControl() {
        let inv = invert4(this.getViewMatrix());
    
        const forward = this.activeKeys.includes("KeyW") ? -1 : this.activeKeys.includes("KeyS") ? 1 : 0;
        const strafe = this.activeKeys.includes("KeyD") ? 1 : this.activeKeys.includes("KeyA") ? -1 : 0;
        const rollLeft = this.activeKeys.includes("KeyQ") ? 1 : 0;
        const rollRight = this.activeKeys.includes("KeyE") ? 1 : 0;
    
        if (forward !== 0) inv = translate4(inv, 0, 0, -forward * this.moveSpeed);
        if (strafe !== 0) inv = translate4(inv, strafe * this.moveSpeed, 0, 0);
    
        // Q / E roll around Z axis
        if (rollLeft) inv = rotate4(inv, 0.005, 0, 0, 1);
        if (rollRight) inv = rotate4(inv, -0.005, 0, 0, 1);
    
        this.setViewMatrix(invert4(inv));
    }
    

    getActiveKeys() {
        return this.activeKeys;
    }

    getCurrentViewMatrix() {
        return this.getViewMatrix();
    }
}