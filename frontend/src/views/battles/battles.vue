<template>
	<div class="page-content page-battles">
		<v-container grid-list-xl>
			<div class="disp-flex flex-wrap">
				<div class="flex-grow mr-4 game-main">
					<div class="mb-3 disp-flex flex-wrap flex-center-y flex-between">
						<span class="title primary--text fw-bold text-uppercase">Case Battles</span>
						<v-btn
							v-if="user && user.keyCount"
							color="primary"
							class="ma-0"
							@click="$modal.open($root, 'battleCreate', {maxWidth: 700})"
						>
							<fai :icon="['fas', 'plus']" class="mr-2"></fai>Start a Battle
						</v-btn>
						<v-btn
							v-else
							color="primary"
							class="ma-0"
							@click="$modal.open($root, 'battleDeposit', {maxWidth: 400, persistent: true})"
						>
							<fai :icon="['fas', 'plus']" class="mr-2"></fai>Deposit
						</v-btn>
					</div>

					<table class="listings">
						<thead>
							<tr class="text-uppercase caption text-faded-5">
								<th class="fw-regular text-center">Rounds</th>
								<th class="fw-regular text-center">Cases</th>
								<th class="fw-regular text-center">Total</th>
								<th class="fw-regular text-center">Players</th>
							</tr>
						</thead>

						<transition-group tag="tbody" name="scaleIn">
							<tr
								class="listing elevation-5"
								v-for="listing in listingsSorted"
								:key="listing.id"
							>
								<td class="rounds z-2 elevation-10 dark relative pa-3">
									<div class="inner disp-flex flex-no-shrink flex-center">
										<div class="text-center">
											<div class="number title">{{listing.cases.length}}</div>
											<small
												class="fw-bold primary--text text-uppercase"
											>{{listing.cases.length > 1 ? 'Rounds' : 'Round'}}</small>
										</div>
									</div>
								</td>

								<td class="z-1 cases darker flex-grow darker relative">
									<div class="inner disp-flex flex-center-y py-3 px-2">
										<div
											class="case text-center fw-bold mr-2"
											v-for="(box, i) in listing.casesGrouped"
											:key="i"
										>
											<img :title="cases[i].name" :src="cases[i].url" alt="case">
											<div class="relative z-2 number title">x{{box.length}}</div>
										</div>
									</div>
								</td>

								<td
									class="cost dark z-2 text-center elevation-10 relative tertiary--text px-3 fw-semibold number divider-right"
								>
									${{listing.totalKeyCost * 250 | currencyInt}}
									<br>
									<div class="caption fw-bold text-faded-5 disp-flex flex-center">
										<fai
											:icon="['fas', 'key']"
											class="icon tertiary--text caption mr-1"
											size="sm"
										></fai>
										{{listing.totalKeyCost}}
									</div>
								</td>

								<td
									class="players-ctn z-3 dark relative px-3 fw-semibold number divider-right"
								>
									<div class="disp-flex title flex-center-x flex-align-end mb-2">
										{{listing.players.length}}
										<small
											class="text-faded-5"
										>/{{listing.slots}}</small>
									</div>

									<div class="players disp-flex flex-center">
										<div class="slot mr-1" v-for="i in listing.slots" :key="i">
											<v-tooltip top color="primary" v-if="listing.players[i-1]">
												<img
													slot="activator"
													:src="listing.players[i-1].avatarUrl"
													alt="user"
												>
												<span>{{listing.players[i-1].username}}</span>
											</v-tooltip>
										</div>
									</div>
								</td>

								<td class="actions z-3 dark px-3">
									<div class="inner disp-flex flex-center">
										<v-btn
											small
											round
											color="primary"
											class="my-0 mr-2"
											@click="$modal.open($root, 'battleJoin', {maxWidth: 400}, listing)"
											v-show="listing.players.length < listing.slots && (user && !listing.players.some(i => i.steamID === user.steamID))"
										>Join</v-btn>

										<v-btn
											:icon="listing.players.length < listing.slots"
											round
											color="darker"
											class="ma-0"
											:to="'/battle/'+listing.id"
										>
											<fai
												:icon="['fas', 'eye']"
												class="primary--text"
												:class="{'mr-2': listing.players.length === listing.slots}"
											></fai>
											<span v-show="listing.players.length === listing.slots">Watch</span>
										</v-btn>
									</div>
								</td>
							</tr>
						</transition-group>
					</table>
				</div>
				<div class="game-sidebar">
					<!-- <h1 class="fw-bold mb-1 tertiary--text">Battle Stats</h1>
          <v-card class="dark border-rounded-2 elevation-8 mb-3">
            <div class="stats pa-3 text-uppercase caption fw-semibold">
              <div class="fw-bold tertiary--text">Today</div>
              <div class="stat disp-flex flex-between">
                <span class="text-faded-5">Battles Fought</span>
                <span class="number text-uppercase">{{29232 | numberInt}}</span>
              </div>
              <div class="stat disp-flex flex-between mb-2">
                <span class="text-faded-5">Total Won</span>
                <span class="number text-uppercase">${{234e3 | currencyInt}}</span>
              </div>
              <div class="fw-bold tertiary--text">All Time</div>
              <div class="stat disp-flex flex-between">
                <span class="text-faded-5">Battles Fought</span>
                <span class="number text-uppercase">{{29232 | numberInt}}</span>
              </div>
              <div class="stat disp-flex flex-between">
                <span class="text-faded-5">Total Won</span>
                <span class="number text-uppercase">${{234e3 | currencyInt}}</span>
              </div>
            </div>
					</v-card>-->
					<div
						class="dark border-rounded-3 elevation-3 disp-flex flex-center-y key-count mb-3"
						v-if="user"
					>
						<span class="relative mx-3 number body-2 mb-1 flex-grow">
							<fai
								:icon="['fas', 'swords']"
								class="icon caption key-icon mr-2 primary--text text-faded-5"
								size="sm"
							></fai>
							<fai
								:icon="['fas', 'sync-alt']"
								class="icon caption refresh-btn absolute secondary--text"
								size="sm"
								@click="refreshKeys()"
								:spin="loadingKeys"
							></fai>
							<span class="fw-semibold number">{{user.keyCount}}</span>
							<span class="text-uppercase fw-semibold ml-1">Battle Keys</span>
						</span>
						<v-btn
							class="ml-0 val"
							small
							color="primary"
							@click="$modal.open($root, 'battleDeposit', {maxWidth: 400, persistent: true})"
						>
							<fai :icon="['fas', 'plus']" class="mx-1 icon caption"></fai>
							<span class="mx-1 text-uppercase fw-bold caption">Deposit</span>
						</v-btn>
					</div>

					<v-card class="darker border-rounded-2 mb-3 px-3 py-2">
						<h3 class="fw-bold mb-1 quaternary--text">How does it work?</h3>
						<p>
							Case battles are ways to increase your profit by competing with other players for who gets the highest total in an unboxing. The winner collects all the
							<b>loot</b> from the other players.
						</p>
						<p>You can make private lobbies for just you and your friends or open it to the public. Everyone opens the same cases in the same order and everyone (even spectators) sees what the others unbox live.</p>
						<p
							class="fw-semibold primary--text"
						>Make sure you deposit vKeys before creating or entering games!</p>
					</v-card>

					<!--<v-card
						class="danger&#45;&#45;text dark fw-semibold number caption border-rounded-2 mb-3 px-3 py-2"
					>
						The battles gamemode is still in beta. If you think something went wrong, please post your battle ID along with a description in our
						<a
							href="https://discord.gg/xrSxPJv"
							class="text&#45;&#45;text fw-bold"
							target="_blank"
						>#support channel on Discord</a>. Go to your Account page, then History, to find the ID of the battle.
					</v-card>-->

					<v-card
						class="darker border-rounded-2 shortcuts mb-3 px-3 py-2"
						v-if="$vuetify.breakpoint.width > 600"
					>
						<div class="disp-flex flex-center-y mb-2">
							<div class="fw-semibold mb-1 text-uppercase">Hotkeys &amp; Shortcuts</div>
							<v-spacer></v-spacer>
							<v-switch
								class="no-label mr-2"
								color="tertiary"
								v-model="localSettings.battleShortcuts"
								hide-details
							></v-switch>
						</div>

						<div :class="{'text-faded-3': !localSettings.battleShortcuts}">
							<div class="disp-flex text-uppercase flex-between flex-center-y mb-2">
								<div class="number fw-semibold text-faded-5">Create Battle</div>
								<small class="key fw-bold elevation-5 px-3 py-1">Enter</small>
							</div>
							<div class="disp-flex text-uppercase flex-between flex-center-y mb-2">
								<div class="number fw-semibold text-faded-5">Create Quick 1v1</div>
								<div>
									<v-menu
										offset-y
										attach
										:nudge-left="100"
										:min-width="250"
										:max-width="320"
										:nudge-bottom="10"
										open-on-hover
										:close-on-content-click="false"
									>
										<img
											:title="cases[localSettings.battleShortcutsFavBox].name"
											slot="activator"
											:src="cases[localSettings.battleShortcutsFavBox].url"
											alt="case icon"
											class="case select mr-2"
										>
										<v-card class="pa-2 border-rounded-3" color="dark">
											<small
												class="fw-bold text-uppercase primary--text mb-2"
											>Select your favourite case</small>
											<div class="disp-flex flex-center-y flex-wrap">
												<img
													:title="box.name"
													:src="box.url"
													alt="case icon"
													:class="{active: localSettings.battleShortcutsFavBox === box.id}"
													@click="localSettings.battleShortcutsFavBox = box.id"
													class="case"
													v-for="box in cases"
													:key="box.id"
												>
											</div>
										</v-card>
									</v-menu>
									<small class="key fw-bold elevation-5 px-3 py-1">J</small>
								</div>
							</div>
							<div class="disp-flex text-uppercase flex-between flex-center-y mb-2">
								<div class="number fw-semibold text-faded-5">Quick-Join 1v1</div>
								<small class="key fw-bold elevation-5 px-3 py-1">K</small>
							</div>
							<div class="disp-flex text-uppercase flex-between flex-center-y mb-2">
								<div class="number fw-semibold">
									<span class="text-faded-5">Join any</span>
									<v-menu
										offset-y
										attach
										:min-width="250"
										:nudge-left="100"
										:nudge-bottom="10"
										open-on-hover
										:close-on-content-click="false"
									>
										<input
											slot="activator"
											v-model.number="shortcuts.rounds"
											class="round-input mx-1"
											type="number"
											min="1"
											max="32"
										>
										<v-card class="pa-2 border-rounded-3" color="dark">
											<v-slider
												color="tertiary"
												class="pa-0"
												v-model="shortcuts.rounds"
												hide-details
												:min="1"
												:max="32"
												step="1"
											></v-slider>
										</v-card>
									</v-menu>
									<span class="text-faded-5">round battles</span>
								</div>
								<small class="key fw-bold elevation-5 px-3 py-1">L</small>
							</div>
						</div>
					</v-card>
				</div>
			</div>
		</v-container>
	</div>
</template>

<style lang="scss" src="./battles.scss" scoped></style>

<script>
import socket from '@/lib/socket'
import { EVENTS } from '@/api/endpoints'

import groupBy from 'lodash-es/groupBy'
import sortBy from 'lodash-es/sortBy'

import { Errors, parseItem } from '@/utils'

export default {
	name: 'pageBattles',
	store: ['config', 'auth', 'actions', 'state', 'localSettings'],
	data() {
		return {
			loading: false,
			stats: null,
			listings: [],
			topUnboxes: [],
			shortcuts: {
				loading: false,
				rounds: 3
			},
			loadingKeys: false
		}
	},
	beforeMount() {
		this.loading = true
		this.actions.battle
			.list()
			.then(resp => {
				resp.forEach(i => (i.casesGrouped = groupBy(i.cases)))
				this.listings = resp
			})
			.catch(err => {
				this.$toast.open({
					type: 'error',
					text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
				})
			})
			.finally(() => (this.loading = false))

		// events
		socket.on(EVENTS.battles.newPlayer, (id, player) => {
			let listing = this.listings.find(i => i.id === id)

			if (listing) {
				listing.players.push(player)
			}
		})

		socket.on(EVENTS.battles.newBattle, data => {
			data.casesGrouped = groupBy(data.cases)
			this.listings.push(data)
		})

		// update slots if started early
		socket.on(EVENTS.battles.pending, data => {
			let listing = this.listings.find(i => i.id === data.id)
			if (listing) listing.slots = data.slots
		})

		socket.on(EVENTS.battles.finished, data => {
			this.listings = this.listings.filter(i => i.id !== data.id)
		})

		socket.on(EVENTS.battles.errored, data => {
			this.listings = this.listings.filter(i => i.id !== id)
		})

		socket.on(EVENTS.battles.expired, id => {
			this.listings = this.listings.filter(i => i.id !== id)
		})

		window.addEventListener('keyup', this.shortcutsHandler)
	},
	methods: {
		refreshKeys() {
			if (this.loadingKeys) return
			this.loadingKeys = true

			this.actions.user
				.get()
				.then(user => (this.user.keyCount = user.keyCount))
				.catch(err => console.error(this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`))
				.finally(() => {
					this.loadingKeys = false
				})
		},
		shortcutsHandler(e) {
			if (!this.localSettings.battleShortcuts) return
			if (e.target.nodeName == 'TEXTAREA' || e.target.nodeName == 'INPUT') return
			if (document.querySelector('.dialog__content')) return

			// 1v1
			if (e.which === 74) {
				e.preventDefault()

				if (!this.user) return
				if (this.shortcuts.loading) return
				if (this.user.keyCount < 1)
					return this.$toast.open({
						type: 'error',
						title: 'Quick 1v1',
						text: "You don't have enough keys for this actions."
					})

				this.shortcuts.loading = true

				this.actions.battle
					.create([this.localSettings.battleShortcutsFavBox], 2, false)
					.then(resp => {
						this.user.keyCount--
						this.$router.push('/battle/' + resp.id)

						this.$toast.open({
							type: 'success',
							text: 'Your battle has been created.'
						})
					})
					.catch(err => {
						this.$toast.open({
							type: 'error',
							title: "Couldn't Create Battle",
							text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
						})
					})
					.finally(() => {
						this.shortcuts.loading = false
					})
			}

			if (e.which === 75) {
				e.preventDefault()

				let listing = this.listings.find(i => i.cases.length === 1 && i.players.length < i.slots)
				if (listing) this.$modal.open(this, 'battleJoin', { maxWidth: 400 }, listing)
				else
					this.$toast.open({
						type: 'error',
						text: 'No matching battles found.'
					})
			}

			if (e.which === 76) {
				e.preventDefault()

				let listing = this.listings.find(i => i.cases.length === this.shortcuts.rounds && i.players.length < i.slots)
				if (listing) this.$modal.open(this, 'battleJoin', { maxWidth: 400 }, listing)
				else
					this.$toast.open({
						type: 'error',
						text: 'No matching battles found.'
					})
			}

			// create battle
			if (e.which === 13) {
				e.preventDefault()
				this.$modal.open(this, 'battleCreate', { maxWidth: 700 })
			}
		}
	},
	beforeDestroy() {
		// remove all battle listeners
		for (const event of Object.values(EVENTS.battles)) {
			socket.removeAllListeners(event)
		}

		window.removeEventListener('keyup', this.shortcutsHandler)
	},
	computed: {
		user() {
			if (this.auth.authenticated) return this.auth.user
			else return null
		},
		listingsSorted() {
			return sortBy(this.listings, 'totalKeyCost').reverse()
		},
		cases() {
			return this.state.cases.reduce(function(acc, cur, i) {
				acc[cur.id] = cur
				return acc
			}, {})
		}
	}
}
</script>

