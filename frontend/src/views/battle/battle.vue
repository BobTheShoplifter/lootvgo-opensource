<template>
	<div class="page-content page-battle">
		<transition name="scaleIn">
			<div
				class="loading absolute disp-flex flex-column flex-center"
				v-if="loading"
			>
				<v-progress-circular class="mb-3" indeterminate color="primary" size="50"></v-progress-circular>
				<span class="text-uppercase fw-bold">Loading</span>
			</div>
		</transition>

		<transition name="scaleIn">
			<v-container grid-list-md v-if="battle && !loading">
				<v-layout row wrap class="flex-no-shrink pt-4">
					<v-flex xs12 sm12 md12 class="flex-no-shrink">
						<div
							class="title mb-3 primary--text disp-flex flex-center-y flex-between"
						>
							<v-btn flat color="primary" class="ma-0" to="/battles">
								<span class="mx-2">
									<fai :icon="['far', 'long-arrow-left']" class="mr-2"></fai>Back to Battles
								</span>
							</v-btn>
							<v-btn
								flat
								color="primary"
								class="ma-0"
								@click="$modal.open($root, 'battleShare', {maxWidth: 600}, battle)"
							>
								<span class="mx-2">
									<fai :icon="['far', 'link']" class="mr-2"></fai>Share Link
								</span>
							</v-btn>
						</div>
					</v-flex>

					<v-flex xs12 sm12 md12 class="mb-2 rounds text-center flex-no-shrink">
						<h1 class="fw-bold primadry--text mb-2">{{status}}</h1>
						<div class="fw-bold text-center">
							<div
								class="rounds-list disp-flex flex-center-y"
								:style="{transform: `translateX(calc(50% - ${(currentRound) * 72 + 32}px))`}"
							>
								<div
									class="round mr-2 disp-flex flex-center active"
									:class="{invisible: currentRound > 0}"
								>
									<v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
								</div>

								<div
									class="round mr-2"
									v-for="(boxId, i) in battle.cases"
									:key="i"
									:class="{active: i + 1 === currentRound}"
								>
									<img
										:title="cases[boxId].name"
										:src="cases[boxId].url"
										class="case"
										alt="case"
									>
									<div class="number caption fw-bold text-uppercase">Round {{i + 1}}</div>
								</div>
							</div>
						</div>
					</v-flex>

					<v-flex md12>
						<v-layout row wrap class="flex-around game">
							<v-flex
								class="disp-flex user-column flex-column flex-no-shrink"
								:style="{flexBasis: 100 / battle.slots+'%'}"
								v-for="i in battle.slots"
								:key="i"
							>
								<v-card
									class="relative elevation-5 dark spinner-ctn disp-flex flex-column flex-grow z-2"
								>
									<spinner
										v-if="Object.values(players)[i-1] && !finished"
										:caseId="battle.cases[currentRound - 1]"
										:player="Object.values(players)[i-1]"
										:playerSlot="i"
										:item="roundCases[Object.values(players)[i-1].steamID]"
										:seedData="seed"
										:bus="bus"
										class="relative z-1"
									></spinner>

									<transition name="scaleCirclular">
										<div
											class="status disp-flex flex-center absolute z-2 dark"
											v-if="currentRound < 1 || finished"
										>
											<transition name="scale">
												<div
													class="text-uppercase text-center absolute"
													v-if="Object.values(players)[i-1] && !finished"
												>
													<fai :icon="['fas', 'check']" class="display-1 success--text"></fai>
													<div class="caption fw-bold mt-2 mb-3">Player Joined</div>

													<v-btn
														v-if="user && battle.userID === user.steamID && Object.keys(players).length > 1 && Object.keys(players)[i-1] === battle.userID && battle.slots > 2 && !nowStarted && Object.keys(players).length !== battle.slots"
														small
														color="primary"
														@click="startNow()"
													>
														<fai :icon="['fas', 'check']" class="mr-2"></fai>
														<span class="text-uppercase">Start Now</span>
													</v-btn>
												</div>
											</transition>
											<transition name="scale">
												<div
													class="text-center absolute"
													v-if="!Object.values(players)[i-1] && !finished"
												>
													<v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
													<div
														class="caption text-uppercase fw-bold mt-2"
													>Waiting for players</div>
												</div>
											</transition>
											<transition name="scale">
												<div
													class="text-uppercase text-center absolute"
													:class="{winner: Object.values(players)[i-1].steamID === battle.winnerID && tally.done}"
													v-if="finished"
												>
													<v-progress-circular
														:rotate="-90"
														:width="8"
														:value="tally.players[Object.values(players)[i-1].steamID].end / tally.total * 100"
														color="primary"
														size="80"
													></v-progress-circular>
													<countTo
														class="number disp-block title fw-bold mt-2"
														:startVal="tally.players[Object.values(players)[i-1].steamID].start / 100"
														:endVal="tally.players[Object.values(players)[i-1].steamID].end / 100"
														prefix="$"
														:decimals="2"
														:duration="1200"
													></countTo>
													<div
														class="absolute number price-flyoff title fw-bold success--text"
														v-if="tally.players[Object.values(players)[i-1].steamID]"
													>+${{tally.players[Object.values(players)[i-1].steamID].current | currencyInt}}</div>
												</div>
											</transition>
										</div>
									</transition>
								</v-card>

								<v-card class="dark elevation-3 z-5 px-3 py-2 text-center">
									<a
										class="user number disp-flex link flex-center text--text"
										v-if="Object.values(players)[i-1]"
										:href="`https://steamcommunity.com/profiles/${Object.values(players)[i-1].steamID}`"
										target="_blank"
									>
										<img
											:src="Object.values(players)[i-1].avatarUrl"
											alt="user icon"
											class="border-rounded-2 mr-2"
										>
										<span
											class="primary--text fw-semibold"
										>{{Object.values(players)[i-1].username}}</span>
									</a>
									<v-btn
										v-else-if="user && battle.players.some(i => i.steamID === user.steamID)"
										small
										flat
										color="primary"
										@click="$modal.open($root, 'battleShare', {maxWidth: 600}, battle)"
									>
										<fai :icon="['fas', 'plus']" class="mr-2"></fai>
										<span class="text-uppercase">Invite</span>
									</v-btn>
									<v-btn
										v-else
										small
										flat
										color="primary"
										@click="$modal.open($root, 'battleJoin', {maxWidth: 400}, battle)"
									>
										<fai :icon="['fas', 'plus']" class="mr-2"></fai>
										<span class="text-uppercase">Join Fight</span>
									</v-btn>
								</v-card>

								<v-card class="darker relative items-ctn flex-grow">
									<transition-group
										tag="div"
										name="insert"
										class="relative items number"
										v-if="Object.values(players)[i-1]"
									>
										<div
											class="item flex-no-shrink disp-flex flex-center-y pa-2"
											:style="{borderColor: item.color}"
											v-for="(item, o) in Object.values(players)[i-1].items"
											:key="item.id"
											v-if="!item.hidden && (showRoundItems ? Object.values(players)[i-1].items.length - o < currentRound + 1 : Object.values(players)[i-1].items.length - o < currentRound)"
										>
											<img :src="item.url" class="icon mr-2" alt="item icon">
											<div
												class="name subheading fw-semibold text-uppercase"
												:style="{color: item.color}"
											>
												{{item.skin || item.name}}
												<span
													class="text-faded-5 fw-bold"
												>{{item.wearShort}}</span>
												<div
													class="text-faded-5 primary--text fw-semibold caption"
												>Round {{Object.values(players)[i-1].items.length - o}}</div>
											</div>
											<v-spacer></v-spacer>
											<span
												class="number subheading mr-2 tertiary--text"
											>${{item.price | currencyInt}}</span>
											<!-- <v-btn small flat color="primary" class="val">
                        <fai :icon="['fas', 'eye']"></fai>
											</v-btn>-->
										</div>
									</transition-group>
								</v-card>
							</v-flex>
						</v-layout>

						<!-- <v-layout row wrap class="flex-around ">
              <v-flex class="user-ctn disp-flex flex-column flex-no-shrink" v-for="i in battle.slots" :key="i">

              </v-flex>
						</v-layout>-->
					</v-flex>
				</v-layout>
			</v-container>
		</transition>
	</div>
</template>

<style lang="scss" src="./battle.scss" scoped></style>
<script src="./battle.js"></script>
