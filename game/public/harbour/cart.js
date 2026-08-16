/**
 * Player cart. PLAN: spawn as people with a cart.
 * Lead stub — builder fills this file only. Do not move player.position.
 */
export function dressCart(player) {
  if (!player || player.userData.cart) return player;
  player.userData.cart = true;
  return player;
}
