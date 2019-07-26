<template>
  <v-card class="modal">
    <v-card-title>
      Start a Battle
      <v-spacer></v-spacer>
      <div class="dark caption body-2 disp-flex flex-center-y key-count" v-if="user">
        <fai :icon="['fas', 'key']" class="icon caption key-icon mr-2 primary--text text-faded-5" size="sm"></fai>
        <span class="fw-semibold number" :class="{'danger--text fw-bold': user && user.keyCount < rounds.length}">{{user.keyCount}}</span>
        <span class="text-uppercase fw-semibold ml-1" :class="{'danger--text fw-bold': user && user.keyCount < rounds.length}">Battle Keys</span>
        <v-btn class="ma-0 ml-1 val" small flat color="primary" @click="$modal.open($root, 'battleDeposit', {maxWidth: 400, persistent: true})">
          <fai :icon="['fas', 'plus']" class="icon caption"></fai>
        </v-btn>
      </div>
    </v-card-title>
    <v-card-text class="number">
      <p class="fw-semibold text-center">
        Click the cases from side to add them to your rounds. To remove a case from the rounds, click on it. The order of the rounds you see below is the order they will be played in. Next, select the amount of players and the privacy setting and you're ready to go.
      </p>

      <v-container grid-list-md>
        <v-layout wrap>

          <v-flex md8 class="rounds flex-column disp-flex">
            <h3 class="primary--text mb-1 disp-flex flex-center-y">
              <span class="mr-3">Rounds</span>
              <small class="fw-semibold mr-3 text-uppercase text-faded-5 primary--text">{{rounds.length}} rounds</small>
              <small class="fw-semibold text-uppercase text-faded-5 primary--text">{{keysRequired}} keys</small>

              <v-spacer></v-spacer>
              <a class="caption mr-1 fw-bold text-uppercase secondary--text" v-show="!!rounds.length" @click="rounds = []">Clear</a>
            </h3>

            <transition-group move-class="fade" name="scale" class="card dark cases flex-grow disp-flex flex-center-y flex-wrap">
              <div class="case text-center mx-2" v-for="(box, i) in rounds" :key="box.roundId" @click="rounds.splice(i, 1)">
                <img :src="box.url" alt="case icon">
                <div class="number fw-bold">{{box.id}}</div>
              </div>
            </transition-group>

          </v-flex>

          <v-flex md4 class="flex-column select-cases disp-flex mb-3">
            <h3 class="primary--text mb-1">Cases</h3>

            <v-card class="dark flex-grow">
              <div class="case disp-flex flex-center-y" v-for="box in state.cases" v-if="!!box.remaining" :key="box.id" @click="box.remaining < 1 ? null : addRound(box)" v-ripple>
                <img class="mr-2 ml-1" :src="box.url" alt="case icon">
                <div class="fw-semibold">{{box.name}}</div>
              </div>
            </v-card>

          </v-flex>

          <v-flex md6 class="disp-flex flex-column flex-center">
            <div class="disp-flex flex-center-y mb-2">
              <v-btn icon color="primary" @click="playersChange(false)">
                <fai :icon="['fas', 'minus']"></fai>
              </v-btn>

              <div class="number mx-3 display-2">{{players}}</div>

              <v-btn icon color="primary" @click="playersChange(true)">
                <fai :icon="['fas', 'plus']"></fai>
              </v-btn>

            </div>
            <div class="text-uppercase fw-bold secondary--text">Player Slots</div>
          </v-flex>

          <v-flex md6 class="disp-flex flex-column flex-center">
            <div class="disp-flex flex-center-y">
              <v-switch v-model="inviteOnly" color="primary" hide-details></v-switch>
              <label class="inv-label subheading ml-2" @click="inviteOnly = !inviteOnly">Invite-only</label>
            </div>
            <small class="text-faded-5 mb-2">Make this game only joinable via a share link.</small>
            <div class="text-uppercase fw-bold secondary--text">Battle Privacy</div>
          </v-flex>

        </v-layout>
      </v-container>

      <!-- </div> -->

    </v-card-text>
    <v-card-actions>
      <v-btn flat small @click="close" class="mr-1">{{$t(`common.close`)}}</v-btn>
      <v-btn v-if="user" round small color="primary has-glow" :disabled="!rounds.length || user.keyCount < rounds.length" @click="create">Create</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { Errors, RequestStates } from '@/utils'

export default {
  props: ['close'],
  store: ['config', 'actions', 'state', 'auth'],
  data() {
    return {
      loading: false,
      players: 2,
      inviteOnly: false,
      rounds: []
    }
  },
  mounted() {},
  methods: {
    addRound(box) {
      if (this.rounds.length >= 40) return

      box = Object.assign({}, box)
      box.roundId = genID()
      this.rounds.push(box)
    },
    playersChange(plus) {
      if (plus && this.players >= 5) return
      if (!plus && this.players <= 2) return

      if (plus) this.players++
      else this.players--
    },
    create() {
      if (this.loading) return

      if (!this.user) {
        return this.$toast.open({
          type: 'error',
          text: this.$t('errors.NotLoggedIn')
        })
      }

      this.loading = true

      this.actions.battle
        .create(this.rounds.map(i => i.id), this.players, this.inviteOnly)
        .then(resp => {
          this.user.keyCount -= this.keysRequired
          this.$router.push('/battle/' + resp.id)

          this.$toast.open({
            type: 'success',
            text: 'Your battle has been created.'
          })

          this.close()
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: "Couldn't Create Battle",
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })
        })
        .finally(() => {
          this.loading = false
        })
    }
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
    keysRequired() {
      return this.rounds.reduce((acc, i) => acc + i.keysPerCase, 0)
    }
  }
}

function genID() {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return (
    '_' +
    Math.random()
      .toString(36)
      .substr(2, 9)
  )
}
</script>

<style lang="scss" scoped>
@import '../styles/variables.scss';

.input-ctn {
  z-index: 3;

  > .dark {
    border-radius: 3px;
  }

  .btn.val {
    min-width: unset;
  }
}

.inv-label {
  cursor: pointer;
}

.select-cases {
  .case {
    transition: background 0.3s ease;

    &:hover {
      background: $dark + 10;
    }
  }

  .card {
    max-height: 200px;
    overflow-y: auto;
  }
}

.case {
  user-select: none;
  cursor: pointer;
  img {
    max-width: 50px;
  }
}

.rounds {
  .cases {
    max-height: 200px;
    overflow-y: auto;
    align-content: start;
    align-items: start;
  }

  .case {
    transition: opacity 0.3s ease;

    &:hover {
      opacity: 0.3;
    }

    img {
      margin-bottom: -25px;
    }
  }
}

input:active,
input:focus {
  outline: none;
}

textarea,
input {
  max-width: 100px;
  padding: 8px;
}
</style>

