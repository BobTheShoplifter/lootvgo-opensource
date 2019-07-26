<template>
	<div class="app-container">
		<transition name="clipCircleDown" v-if="problem || loading">
			<div class="start-overlay">
				<v-layout align-center justify-center>
					<div v-if="!problem" class="logo-icon">
						<svg
							v-html="require('./img/logo/icon.svg')"
							xmlns="http://www.w3.org/2000/svg"
							preserveAspectRatio="xMinYMin meet"
							viewBox="0 0 100 100"
						></svg>
					</div>
					<fai
						v-else-if="update"
						class="danger--text mr-3"
						size="5x"
						:icon="['far','cloud-download-alt']"
					></fai>
					<fai
						v-else
						class="danger--text mr-3"
						size="5x"
						:icon="['far','times-hexagon']"
					></fai>

					<div v-if="problem" class="meta">
						<div v-if="maintenance" class="display-1">Maintenance</div>
						<div v-else-if="update" class="display-1">Update Downloaded</div>
						<div v-else class="display-1">Something went wrong :(</div>

						<div class="fw-bold number danger--text">
							{{problem}}
							<div v-if="problem.indexOf('whitelist') !== -1" class="mt-3">
								<v-btn color="primary" href="/auth" class="has-glow ma-0">
									<span class="py-2">
										<fai :icon="['fas', 'sign-in']" size="lg" class="mr-2 icon-svg"></fai>Login via <svg
                    class="op-icon mx-1"
                    v-html="require('@/img/wax-access.svg')"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 909 1250"
                  ></svg>
									</span>
								</v-btn>
							</div>
						</div>
					</div>
				</v-layout>
			</div>
		</transition>
		<interface :loading.sync="loading" v-if="connected"></interface>
	</div>
</template>

<script>
import { close as closeToast } from './components/toast'
import { Errors } from './utils'

import socket from './lib/socket'
import Auth from './lib/auth'

import Interface from './views/interface'
export default {
	name: 'App',
	data() {
		return {
			connected: false,
			disconnected: false,
			loading: true,
			problem: false,
			maintenance: null,
			reconnectAttempt: 0,
			update: false
		}
	},
	beforeMount() {
		window.perfaudits_preloaderClosed = window.performance.now()
		// wait for socket to connect
		socket.on('connect', () => {
			// reset
			this.reconnectAttempt = 0
			this.problem = false

			if (this.disconnected) {
				this.disconnected = false
				closeToast()
			}

			console.log('Connected to server, initilizing app!')

			Promise.all([getConfig(), Auth.init(socket)])
				.then(values => {
					console.log('Got config and auth', values)
					let config = values[0]
					let auth = { ...values[1] }

					if (auth.authenticated) {
						if (!auth.user.keys) auth.user.keys = 0
						if (!auth.user.credits) auth.user.credits = {}
						this.$ga.set('userId', auth.user.steamID)
					}

					this.$store.config = config

					if (!Object.keys(this.$store.auth).length) {
						this.$store.auth = auth
					}
					this.processConfig(config, auth)

					if (!this.problem) this.connected = true
				})
				.catch(err => {
					this.$toast.open({
						type: 'error',
						title: 'Couldnt Load Config/Auth',
						text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
					})
				})
		})

		socket.on('config.changed', resp => {
			let config = resp.data
			this.processConfig(config, this.$store.auth)
			if (!this.problem && !this.connected) this.connected = true

			this.$store.config = config
		})

		socket.on('reconnecting', attempt => {
			console.warn('Trying to reconnect, attempt:', attempt)
			this.reconnectAttempt = attempt

			if (this.reconnectAttempt === 2) {
				this.$toast.open({
					type: 'error',
					closeable: false,
					timeout: 0,
					sound: false,
					loading: true,
					text: 'You have lost connection to the server. Reconnecting..'
				})
			}

			if (this.reconnectAttempt >= 3) {
				this.problem = 'Connection with the server was lost. Make sure you are online or try again later.'
			}
		})

		socket.on('disconnect', resp => {
			if (this.disconnected) return
			this.disconnected = true
		})

		window.addEventListener('updateAvailable', () => {
			this.loading = true
			this.update = true
			this.problem = 'An update has been found, reloading site...'

			setTimeout(() => location.reload(), 2000)
		})
	},
	methods: {
		processConfig(config, auth) {
			if (config.whitelist.enabled) {
				let inWhitelist = auth.authenticated
					? config.whitelist.list.map(i => i.steamID).includes(auth.user.steamID)
					: false
				if (!inWhitelist) return (this.problem = 'You are not on the whitelist.')
			} else {
				this.problem = false
			}

			if (config.maintenance.active) {
				this.maintenance = true
				if (!auth.user || auth.user.rank !== 1) {
					return (this.problem = config.maintenance.info)
				}
			} else {
				this.maintenance = false
				this.problem = false
			}
		}
	},
	components: {
		Interface
	}
}

const getConfig = () => {
	return new Promise((resolve, reject) => {
		socket.emit('config.get', (err, resp) => {
			if (err) return reject(new Error(err))
			resolve(resp)
		})
	})
}
</script>

<style lang="scss">
@import './styles/variables.scss';

.start-overlay {
	width: 100vw;
	height: 100vh;
	display: flex;
	align-content: center;
	justify-content: center;
	position: absolute;
	background: $dark;
	z-index: 999;
	color: $text;
	font-family: 'Raleway', sans-serif;

	.logo-icon {
		width: 20vw;
		max-width: 250px;
		animation: loading-bounce 2.5s ease infinite;
	}

	.progress-circular {
		color: $primary;
	}

	.danger--text {
		color: $danger;
	}

	.primary {
		background: $primary;
	}
}
</style>


