// Stick figure pose data for the player
// Each pose defines joint positions relative to hip center
// Joints: head, neck, shoulderL, shoulderR, elbowL, elbowR, handL, handR,
//         hip, kneeL, kneeR, footL, footR

const IDLE = [
  {
    head: { x: 0, y: -50 }, neck: { x: 0, y: -38 },
    shoulderL: { x: -12, y: -36 }, shoulderR: { x: 12, y: -36 },
    elbowL: { x: -18, y: -22 }, elbowR: { x: 18, y: -22 },
    handL: { x: -14, y: -10 }, handR: { x: 14, y: -10 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -8, y: 14 }, kneeR: { x: 8, y: 14 },
    footL: { x: -10, y: 30 }, footR: { x: 10, y: 30 },
  },
  {
    head: { x: 0, y: -49 }, neck: { x: 0, y: -37 },
    shoulderL: { x: -12, y: -35 }, shoulderR: { x: 12, y: -35 },
    elbowL: { x: -17, y: -21 }, elbowR: { x: 17, y: -21 },
    handL: { x: -13, y: -9 }, handR: { x: 13, y: -9 },
    hip: { x: 0, y: -3 },
    kneeL: { x: -8, y: 15 }, kneeR: { x: 8, y: 15 },
    footL: { x: -10, y: 30 }, footR: { x: 10, y: 30 },
  },
];

const RUN = [
  {
    head: { x: 2, y: -50 }, neck: { x: 2, y: -38 },
    shoulderL: { x: -10, y: -36 }, shoulderR: { x: 14, y: -36 },
    elbowL: { x: -20, y: -28 }, elbowR: { x: 24, y: -24 },
    handL: { x: -16, y: -16 }, handR: { x: 20, y: -14 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -14, y: 10 }, kneeR: { x: 14, y: 12 },
    footL: { x: -18, y: 28 }, footR: { x: 8, y: 30 },
  },
  {
    head: { x: 2, y: -51 }, neck: { x: 2, y: -39 },
    shoulderL: { x: -10, y: -37 }, shoulderR: { x: 14, y: -37 },
    elbowL: { x: -8, y: -28 }, elbowR: { x: 8, y: -28 },
    handL: { x: -6, y: -18 }, handR: { x: 6, y: -18 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -4, y: 12 }, kneeR: { x: 4, y: 12 },
    footL: { x: -6, y: 30 }, footR: { x: 6, y: 30 },
  },
  {
    head: { x: 2, y: -50 }, neck: { x: 2, y: -38 },
    shoulderL: { x: -10, y: -36 }, shoulderR: { x: 14, y: -36 },
    elbowL: { x: 4, y: -24 }, elbowR: { x: -14, y: -28 },
    handL: { x: 8, y: -14 }, handR: { x: -10, y: -16 },
    hip: { x: 0, y: -4 },
    kneeL: { x: 14, y: 12 }, kneeR: { x: -14, y: 10 },
    footL: { x: 8, y: 30 }, footR: { x: -18, y: 28 },
  },
  {
    head: { x: 2, y: -51 }, neck: { x: 2, y: -39 },
    shoulderL: { x: -10, y: -37 }, shoulderR: { x: 14, y: -37 },
    elbowL: { x: -8, y: -28 }, elbowR: { x: 8, y: -28 },
    handL: { x: -6, y: -18 }, handR: { x: 6, y: -18 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -4, y: 12 }, kneeR: { x: 4, y: 12 },
    footL: { x: -6, y: 30 }, footR: { x: 6, y: 30 },
  },
];

const JUMP = [
  {
    head: { x: 0, y: -52 }, neck: { x: 0, y: -40 },
    shoulderL: { x: -12, y: -38 }, shoulderR: { x: 12, y: -38 },
    elbowL: { x: -20, y: -46 }, elbowR: { x: 20, y: -46 },
    handL: { x: -16, y: -52 }, handR: { x: 16, y: -52 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -12, y: 8 }, kneeR: { x: 12, y: 8 },
    footL: { x: -14, y: 22 }, footR: { x: 14, y: 22 },
  },
];

const FALL = [
  {
    head: { x: 0, y: -48 }, neck: { x: 0, y: -36 },
    shoulderL: { x: -12, y: -34 }, shoulderR: { x: 12, y: -34 },
    elbowL: { x: -22, y: -28 }, elbowR: { x: 22, y: -28 },
    handL: { x: -26, y: -20 }, handR: { x: 26, y: -20 },
    hip: { x: 0, y: -2 },
    kneeL: { x: -10, y: 14 }, kneeR: { x: 10, y: 14 },
    footL: { x: -6, y: 28 }, footR: { x: 6, y: 28 },
  },
];

const SWING = [
  {
    head: { x: 4, y: -48 }, neck: { x: 3, y: -36 },
    shoulderL: { x: -9, y: -34 }, shoulderR: { x: 15, y: -34 },
    elbowL: { x: -6, y: -26 }, elbowR: { x: 20, y: -44 },
    handL: { x: -4, y: -16 }, handR: { x: 18, y: -54 },
    hip: { x: 0, y: -2 },
    kneeL: { x: -10, y: 16 }, kneeR: { x: 8, y: 14 },
    footL: { x: -14, y: 30 }, footR: { x: 4, y: 28 },
  },
];

const PUNCH = [
  // Windup
  {
    head: { x: -2, y: -50 }, neck: { x: -1, y: -38 },
    shoulderL: { x: -12, y: -36 }, shoulderR: { x: 12, y: -36 },
    elbowL: { x: -18, y: -24 }, elbowR: { x: 6, y: -28 },
    handL: { x: -14, y: -12 }, handR: { x: -2, y: -20 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -8, y: 14 }, kneeR: { x: 8, y: 14 },
    footL: { x: -10, y: 30 }, footR: { x: 10, y: 30 },
  },
  // Extended
  {
    head: { x: 4, y: -50 }, neck: { x: 3, y: -38 },
    shoulderL: { x: -10, y: -36 }, shoulderR: { x: 14, y: -36 },
    elbowL: { x: -18, y: -24 }, elbowR: { x: 30, y: -34 },
    handL: { x: -14, y: -12 }, handR: { x: 44, y: -34 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -8, y: 14 }, kneeR: { x: 10, y: 14 },
    footL: { x: -10, y: 30 }, footR: { x: 10, y: 30 },
  },
  // Recovery
  {
    head: { x: 1, y: -50 }, neck: { x: 0, y: -38 },
    shoulderL: { x: -12, y: -36 }, shoulderR: { x: 12, y: -36 },
    elbowL: { x: -18, y: -22 }, elbowR: { x: 22, y: -28 },
    handL: { x: -14, y: -10 }, handR: { x: 26, y: -20 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -8, y: 14 }, kneeR: { x: 8, y: 14 },
    footL: { x: -10, y: 30 }, footR: { x: 10, y: 30 },
  },
];

const KICK = [
  // Windup
  {
    head: { x: -2, y: -50 }, neck: { x: -1, y: -38 },
    shoulderL: { x: -12, y: -36 }, shoulderR: { x: 12, y: -36 },
    elbowL: { x: -20, y: -26 }, elbowR: { x: 20, y: -26 },
    handL: { x: -18, y: -14 }, handR: { x: 18, y: -14 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -10, y: 10 }, kneeR: { x: 6, y: 8 },
    footL: { x: -12, y: 28 }, footR: { x: 2, y: 20 },
  },
  // Extended kick
  {
    head: { x: 2, y: -50 }, neck: { x: 2, y: -38 },
    shoulderL: { x: -10, y: -36 }, shoulderR: { x: 14, y: -36 },
    elbowL: { x: -22, y: -26 }, elbowR: { x: 22, y: -26 },
    handL: { x: -20, y: -14 }, handR: { x: 20, y: -14 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -10, y: 14 }, kneeR: { x: 20, y: 6 },
    footL: { x: -12, y: 30 }, footR: { x: 40, y: 4 },
  },
  // Recovery
  {
    head: { x: 0, y: -50 }, neck: { x: 0, y: -38 },
    shoulderL: { x: -12, y: -36 }, shoulderR: { x: 12, y: -36 },
    elbowL: { x: -18, y: -22 }, elbowR: { x: 18, y: -22 },
    handL: { x: -14, y: -10 }, handR: { x: 14, y: -10 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -8, y: 14 }, kneeR: { x: 12, y: 10 },
    footL: { x: -10, y: 30 }, footR: { x: 16, y: 24 },
  },
];

const DIVE_KICK = [
  {
    head: { x: 6, y: -40 }, neck: { x: 5, y: -30 },
    shoulderL: { x: -6, y: -28 }, shoulderR: { x: 16, y: -28 },
    elbowL: { x: -18, y: -34 }, elbowR: { x: 26, y: -34 },
    handL: { x: -24, y: -40 }, handR: { x: 32, y: -40 },
    hip: { x: 2, y: 0 },
    kneeL: { x: -4, y: 14 }, kneeR: { x: 20, y: 10 },
    footL: { x: -8, y: 28 }, footR: { x: 34, y: 18 },
  },
];

const SWING_KICK = [
  {
    head: { x: 4, y: -46 }, neck: { x: 3, y: -34 },
    shoulderL: { x: -9, y: -32 }, shoulderR: { x: 15, y: -32 },
    elbowL: { x: -6, y: -24 }, elbowR: { x: 20, y: -42 },
    handL: { x: -4, y: -14 }, handR: { x: 18, y: -52 },
    hip: { x: 0, y: 0 },
    kneeL: { x: -6, y: 14 }, kneeR: { x: 24, y: 4 },
    footL: { x: -10, y: 28 }, footR: { x: 42, y: 2 },
  },
];

const WEB_SHOT = [
  {
    head: { x: 2, y: -50 }, neck: { x: 2, y: -38 },
    shoulderL: { x: -10, y: -36 }, shoulderR: { x: 14, y: -36 },
    elbowL: { x: -18, y: -24 }, elbowR: { x: 28, y: -38 },
    handL: { x: -14, y: -12 }, handR: { x: 40, y: -38 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -8, y: 14 }, kneeR: { x: 8, y: 14 },
    footL: { x: -10, y: 30 }, footR: { x: 10, y: 30 },
  },
];

const WEB_PULL = [
  // Arm extended - web attached
  {
    head: { x: 2, y: -50 }, neck: { x: 2, y: -38 },
    shoulderL: { x: -10, y: -36 }, shoulderR: { x: 14, y: -36 },
    elbowL: { x: -18, y: -24 }, elbowR: { x: 30, y: -36 },
    handL: { x: -14, y: -12 }, handR: { x: 42, y: -36 },
    hip: { x: 0, y: -4 },
    kneeL: { x: -10, y: 14 }, kneeR: { x: 8, y: 14 },
    footL: { x: -14, y: 30 }, footR: { x: 10, y: 30 },
  },
  // Pulling back - braced stance
  {
    head: { x: -2, y: -50 }, neck: { x: -1, y: -38 },
    shoulderL: { x: -12, y: -36 }, shoulderR: { x: 12, y: -36 },
    elbowL: { x: -20, y: -24 }, elbowR: { x: 8, y: -30 },
    handL: { x: -16, y: -14 }, handR: { x: 4, y: -24 },
    hip: { x: -2, y: -2 },
    kneeL: { x: -12, y: 14 }, kneeR: { x: 6, y: 14 },
    footL: { x: -16, y: 30 }, footR: { x: 12, y: 30 },
  },
];

const HIT = [
  {
    head: { x: -6, y: -48 }, neck: { x: -4, y: -36 },
    shoulderL: { x: -16, y: -34 }, shoulderR: { x: 8, y: -34 },
    elbowL: { x: -24, y: -24 }, elbowR: { x: 4, y: -24 },
    handL: { x: -22, y: -14 }, handR: { x: 0, y: -14 },
    hip: { x: -2, y: -2 },
    kneeL: { x: -10, y: 14 }, kneeR: { x: 6, y: 14 },
    footL: { x: -12, y: 30 }, footR: { x: 8, y: 30 },
  },
];

const LAND = [
  {
    head: { x: 0, y: -42 }, neck: { x: 0, y: -32 },
    shoulderL: { x: -12, y: -30 }, shoulderR: { x: 12, y: -30 },
    elbowL: { x: -20, y: -20 }, elbowR: { x: 20, y: -20 },
    handL: { x: -18, y: -10 }, handR: { x: 18, y: -10 },
    hip: { x: 0, y: 2 },
    kneeL: { x: -12, y: 18 }, kneeR: { x: 12, y: 18 },
    footL: { x: -14, y: 30 }, footR: { x: 14, y: 30 },
  },
];

export const POSES = {
  IDLE, RUN, JUMP, FALL, SWING, PUNCH, KICK,
  DIVE_KICK, SWING_KICK, WEB_SHOT, WEB_PULL, HIT, LAND,
};

export function lerpPose(a, b, t) {
  const result = {};
  for (const joint in a) {
    result[joint] = {
      x: a[joint].x + (b[joint].x - a[joint].x) * t,
      y: a[joint].y + (b[joint].y - a[joint].y) * t,
    };
  }
  return result;
}
