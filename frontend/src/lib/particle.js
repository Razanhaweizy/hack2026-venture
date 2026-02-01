const MAX_RADIUS = 40
const MOUSE_INFLUENCE_RADIUS = 50
const GROWTH_RATE = 0.5
const SHRINK_RATE = 0.3

export class Particle {
  constructor(x, y, dx, dy, radius) {
    this.x = x
    this.y = y
    this.dx = dx
    this.dy = dy
    this.radius = radius
    this.originalRadius = radius
  }

  update(canvasWidth, canvasHeight, mouseX, mouseY) {
    this.x += this.dx
    this.y += this.dy

    if (this.x - this.radius <= 0) {
      this.x = this.radius
      this.dx = -this.dx
    }
    if (this.x + this.radius >= canvasWidth) {
      this.x = canvasWidth - this.radius
      this.dx = -this.dx
    }
    if (this.y - this.radius <= 0) {
      this.y = this.radius
      this.dy = -this.dy
    }
    if (this.y + this.radius >= canvasHeight) {
      this.y = canvasHeight - this.radius
      this.dy = -this.dy
    }

    const distanceToMouse = Math.hypot(mouseX - this.x, mouseY - this.y)
    if (distanceToMouse <= MOUSE_INFLUENCE_RADIUS && this.radius < MAX_RADIUS) {
      this.radius = Math.min(MAX_RADIUS, this.radius + GROWTH_RATE)
    } else if (this.radius > this.originalRadius) {
      this.radius = Math.max(this.originalRadius, this.radius - SHRINK_RATE)
    }

    this.draw()
  }

  draw() {
  }
}
