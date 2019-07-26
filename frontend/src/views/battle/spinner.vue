<template>
	<div class="spinner disp-flex flex-center">
		<div class="inner">
			<div class="entrylist text-center">
				<img :src="item.url" alt="item icon" v-for="(item, i) in entries" :key="i">
			</div>
		</div>
		<transition name="scaleIn">
			<div class="item-info absolute text-center" v-if="item && showItemInfo">
				<div
					class="number fw-bold title mb-1"
					:style="{color: item.color}"
				>{{item.skin || item.name}}</div>
				<div
					class="text-uppercase caption fw-bold"
					v-if="item.wear"
					:style="{color: item.color}"
				>{{item.wear}}</div>
				<div class="number fw-bold caption">${{item.price | currencyInt}}</div>
			</div>
		</transition>
		<div class="line" v-if="rolling"></div>
		<div class="absolute text-center text-faded-5" v-if="!rolling">
			<v-progress-circular indeterminate color="primary" size="40" class="mb-3"></v-progress-circular>
			<div class="text-uppercase fw-bold caption">Waiting for next round</div>
		</div>
		<!-- {{payload}} -->
	</div>
</template>

<script>
import groupBy from 'lodash-es/groupBy'
import sortBy from 'lodash-es/sortBy'
import shuffle from 'lodash-es/shuffle'

import SeededShuffle from 'seededshuffle'
import anime from 'animejs'

import { Errors, parseItem, SeededRand } from '@/utils'

export default {
	name: 'spinnerSlots',
	props: ['caseId', 'item', 'bus', 'seedData', 'player', 'playerSlot'],
	store: ['config', 'auth', 'state', 'localSettings'],
	data() {
		return {
			rolling: false,
			entries: [],
			showItemInfo: false,
			sounds: null,
			handlers: {
				roll: null,
				tickBack: null,
				special: null
			}
		}
	},
	created() {
		if (!this.sounds) this.initSounds()

		this.bus.$on('roll', this.roll)
	},
	beforeDestroy() {
		this.bus.$off('roll')
	},
	methods: {
		roll() {
			if (!this.item) return

			if (this.rolling) {
				for (const handler of Object.values(this.handlers)) {
					if (handler) handler.pause()
				}
			}

			this.$el.querySelector('.spinner .entrylist').removeAttribute('style')
			this.rolling = true
			this.showItemInfo = false

			let rand = SeededRand(this.seed)
			let monkaSFactor = rand * (70 - -70) + -70

			let rollLength = 30 * 230

			// entries generation
			this.entries = []
			this.cases[this.caseId].items.filter(i => !!i).forEach(itemGroup => {
				itemGroup[1].caseId = this.caseId
				let item = parseItem(itemGroup[1])
				let odds = Math.floor(item.odds)
				let count = Math.floor(odds * 2)

				if (count < 1) count = rand * (1 - 0) + 0 < odds ? 1 : 0

				for (let i = 0; i < count; i++) {
					let randomItem = parseItem(itemGroup[Math.floor(rand * (Object.keys(itemGroup).length - 1) + 1)])
					if (!randomItem) console.log(itemGroup)
					this.entries.push({
						url: randomItem.url,
						color: randomItem.color
					})
				}
			})

			SeededShuffle.shuffle(this.entries, this.seed, false)
			this.entries.length = 35

			// set winning entry
			this.entries[30] = {
				url: this.item.url,
				color: this.item.color,
				price: this.item.price
			}

			if (this.playerSlot === 1) {
				setTimeout(() => this.sounds.holo_spinup.play(), 150)
			}

			let lastTick = 0
			let lastTickSoundSprite = 0

			this.handlers.roll = anime({
				targets: this.$el.querySelector('.spinner .entrylist'),
				translateY: -(rollLength + monkaSFactor),
				easing: [0.15, 0, 0, 1],
				duration: 6e3,
				update: anim => {
					if (this._isBeingDestroyed || this.playerSlot !== 1) return

					let px = -parseInt(anim.animations[0].currentValue)

					if (lastTick === 0) lastTick = px

					if (px > 300 && px > lastTick + 280) {
						this.sounds.tick.play(lastTickSoundSprite.toString())
						if (lastTickSoundSprite >= 9) lastTickSoundSprite = 0
						else lastTickSoundSprite++

						lastTick = px
					}
				}
			})

			this.handlers.roll.finished.then(() => {
				if (this._isBeingDestroyed) return
				this.handlers.roll = null

				setTimeout(() => {
					if (this.playerSlot === 1) {
						this.sounds.stop.play()
					}

					this.showItemInfo = true
				}, 450)

				this.handlers.tickBack = anime(
					{
						targets: '.spinner .entrylist',
						translateY: -rollLength,
						duration: 500,
						delay: 500
					},
					1500
				)

				this.handlers.tickBack.finished.then(() => {
					if (this._isBeingDestroyed) return
					this.handlers.tickBack = null

					setTimeout(() => {
						this.showItemInfo = false
					}, 1200)

					if (this.playerSlot === 1) this.bus.$emit('spinnerFinished')
				})
			})
		},

		initSounds() {
			this.sounds = {
				tick: new Howl({
					src: [require('@/sounds/case/spinticks.webm'), require('@/sounds/case/spinticks.mp3')],
					format: ['webm', 'mp3'],
					sprite: {
						0: [0, 80],
						1: [100, 80],
						2: [200, 80],
						3: [300, 80],
						4: [400, 80],
						5: [500, 80],
						6: [600, 80],
						7: [700, 80],
						8: [800, 80],
						9: [900, 80]
					},
					volume: 0.4
				}),
				stop: new Howl({
					src: [require('@/sounds/case/stop.webm'), require('@/sounds/case/stop.mp3')],
					format: ['webm', 'mp3'],
					volume: 0.6
				}),
				pull: {
					1: new Howl({
						src: [require('@/sounds/case/pull/pull1.webm'), require('@/sounds/case/pull/pull1.mp3')],
						format: ['webm', 'mp3'],
						volume: 0.2
					}),
					2: new Howl({
						src: [require('@/sounds/case/pull/pull2.webm'), require('@/sounds/case/pull/pull2.mp3')],
						format: ['webm', 'mp3'],
						volume: 0.2
					}),
					3: new Howl({
						src: [require('@/sounds/case/pull/pull3.webm'), require('@/sounds/case/pull/pull3.mp3')],
						format: ['webm', 'mp3'],
						volume: 0.2
					}),
					4: new Howl({
						src: [require('@/sounds/case/pull/pull4.webm'), require('@/sounds/case/pull/pull4.mp3')],
						format: ['webm', 'mp3'],
						volume: 0.2
					}),
					5: new Howl({
						src: [require('@/sounds/case/pull/pull5.webm'), require('@/sounds/case/pull/pull5.mp3')],
						format: ['webm', 'mp3'],
						volume: 0.2
					}),
					6: new Howl({
						src: [require('@/sounds/case/pull/pull6.webm'), require('@/sounds/case/pull/pull6.mp3')],
						format: ['webm', 'mp3'],
						volume: 0.2
					})
				},
				reveal: {
					1: new Howl({
						src: [require('@/sounds/case/reveal/reveal1.webm'), require('@/sounds/case/reveal/reveal1.mp3')],
						format: ['webm', 'mp3'],
						volume: 0.8
					}),
					2: new Howl({
						src: [require('@/sounds/case/reveal/reveal2.webm'), require('@/sounds/case/reveal/reveal2.mp3')],
						format: ['webm', 'mp3'],
						volume: 0.8
					}),
					3: new Howl({
						src: [require('@/sounds/case/reveal/reveal3.webm'), require('@/sounds/case/reveal/reveal3.mp3')],
						format: ['webm', 'mp3'],
						volume: 0.8
					})
				},
				holo_open: new Howl({
					src: [require('@/sounds/case/holo_open.webm'), require('@/sounds/case/holo_open.mp3')],
					format: ['webm', 'mp3'],
					volume: 0.25
				}),
				holo_glitch: new Howl({
					src: [require('@/sounds/case/holo_glitch.webm'), require('@/sounds/case/holo_glitch.mp3')],
					format: ['webm', 'mp3'],
					volume: 0.6
				}),
				holo_spinup: new Howl({
					src: [require('@/sounds/case/holo_spinup.webm'), require('@/sounds/case/holo_spinup.mp3')],
					format: ['webm', 'mp3'],
					volume: 0.6
				}),
				start: new Howl({
					src: [require('@/sounds/case/start.webm'), require('@/sounds/case/start.mp3')],
					format: ['webm', 'mp3'],
					volume: 0.8
				})
			}
		}
	},
	computed: {
		user() {
			if (this.auth.authenticated) return this.auth.user
			else return null
		},
		cases() {
			return this.state.cases.reduce(function(acc, cur, i) {
				acc[cur.id] = cur
				return acc
			}, {})
		},
		caseItems() {
			if (!this.caseId) return []
			let itemGroups = this.cases[this.caseId].items.filter(i => !!i)

			let items = []
			for (let i = 0; i < itemGroups.length; i++) {
				const itemGroup = itemGroups[i]
				for (const key in itemGroup) {
					if (itemGroup.hasOwnProperty(key)) {
						const item = itemGroup[key]
						item.caseId = this.caseId
						items.push(parseItem(item))
					}
				}
			}

			return items
		},

		seed() {
			if (!this.player) return 0
			let playerID = this.player.steamID
			return this.seedData + playerID.substr(playerID.length - 4)
		}
	}
}

function getRandomFloat(min, max) {
	return Math.random() * (max - min) + min
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min
}
</script>

<style lang="scss" scoped>
@import '../../styles/variables.scss';

.spinner {
	z-index: 1;
	height: 100%;
	flex-grow: 1;
	width: 100%;
	position: relative;

	&:before,
	&:after {
		z-index: 1;
		content: ' ';
		position: absolute;
		width: 100%;
		height: 25%;
		left: 0;
		background: linear-gradient(to top, rgba($darker, 0), rgba($darker, 1));
	}

	&:before {
		top: 0;
	}

	&:after {
		transform: rotate(180deg);
		bottom: 0;
	}

	.inner {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;

		.entrylist {
			padding-top: 90px;

			img {
				display: block;
				width: 280px;
				margin: -50px auto;
				height: 280px;
			}
		}
	}

	.item-info {
		bottom: 30%;
		text-shadow: 0 0 5px black;
	}

	.line {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 100%;
		height: 1px;
		z-index: 2;
		background: linear-gradient(to left, rgba($secondary, 0.1), rgba($primary, 1), rgba($secondary, 0.1));
	}
}
</style>
