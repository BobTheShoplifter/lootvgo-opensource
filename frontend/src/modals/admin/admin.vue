<template>
  <v-card class="modal" v-if="user.rank === 1">
    <v-card-title>
      <small class="mr-2">(shitty)</small> Admin Panel
      <v-spacer></v-spacer>
      <v-btn flat color="primary" small class="ma-0" @click="getConfig">
        <fai :icon="['fas','sync-alt']" size="lg" class="mr-2" :spin="loading"></fai> Reload Config
      </v-btn>
    </v-card-title>
    <v-card-text>
      <div v-if="revenue" class="mb-4 disp-flex flex-around flex-align-end flex-wrap">
        <div class="text-center">
          <div class="delta number caption fw-bold disp-flex flex-center mb-1" :title="'$'+$options.filters.currencyInt(revenue.yesterday)" v-if="revenue.delta" :class="revenue.delta > 0 ? 'success--text' : 'danger--text'">
            <fai :icon="['far', 'angle-down']" class="icon caption mr-1"></fai>
            {{revenue.delta.toFixed(2)}}%
          </div>
          <div class="title number">${{revenue.today | currencyInt}}</div>
          <div class="secondary--text fw-bold text-uppercase">Revenue Today</div>
        </div>
        <div class="text-center">
          <div class="title number">${{revenue.today * 0.05 | currencyInt}}</div>
          <div class="secondary--text fw-bold text-uppercase">Developer "Salary"</div>
        </div>
      </div>

      <div class="chart-ctn mb-3">
        <stats-chart v-if="chartData" :data="chartData"></stats-chart>
      </div>

      <h2 class="primary--text text-uppercase mb-2">Blocking</h2>
      <div class="mb-3">
        <v-switch v-model="editedConfig.blocks.chat" hide-details color="danger" label="Block Chat (Regular users)"></v-switch>
        <v-switch v-model="editedConfig.blocks.battle" hide-details color="danger" label="Block Battles (Regular users)"></v-switch>
        <br>
        <v-text-field type="number" label="Chat Cooldown (in ms)" hide-details v-model.number="editedConfig.chatDelay" required></v-text-field>
      </div>

      <h2 class="primary--text text-uppercase mb-2">Maintenance</h2>
      <div class="mb-3">
        <v-switch v-model="editedConfig.maintenance.active" hide-details color="danger" label="Enable Maintenance"></v-switch>
        <textarea v-model="editedConfig.maintenance.info" rows="6" placeholder="A descriptive message of the chaos."></textarea>
      </div>

      <h2 class="primary--text text-uppercase mb-2">Whitelist</h2>
      <div class="mb-3">
        <v-switch v-model="editedConfig.whitelist.enabled" hide-details color="danger" label="Enable Whitelist"></v-switch>
        <div class="add dark has-shadow pa-3 disp-flex flex-center-y mb-2">
          <v-container grid-list-md>
            <v-layout row wrap>
              <v-flex xs12 sm6>
                <v-text-field solo-inverted label="Username" hide-details v-model="inputs.whitelist.name" required></v-text-field>
              </v-flex>
              <v-flex xs12 sm6>
                <v-text-field solo-inverted label="SteamID" hide-details v-model="inputs.whitelist.steamID" required></v-text-field>
              </v-flex>
            </v-layout>
          </v-container>
          <v-btn class="ma-0" large color="primary" @click="editedConfig.whitelist.list.push(inputs.whitelist)" :disabled="!inputs.whitelist.name.length || !inputs.whitelist.steamID.length">Add</v-btn>
        </div>
        <div class="entry-list">
          <div class="entry number disp-flex flex-center-y flex-between pa-2" v-for="(entry, i) in editedConfig.whitelist.list" :key="i">
            <div class="fw-bold">
              {{entry.name}}
            </div>
            <v-spacer></v-spacer>
            <div class="mr-3 text-faded-5">
              {{entry.steamID}}
            </div>
            <div class="number primary--text fw-bold text-right">
              <a @click="editedConfig.whitelist.list.splice(i, 1)" class="mx-2">
                <fai :icon="['fal','times']" class="danger--text icon subheading"></fai>
              </a>
            </div>
          </div>
          <div v-show="!editedConfig.whitelist.list.length" class="text-faded-3 text-uppercase fw-bolt subtitle pa-3">No users in whitelist</div>
        </div>

      </div>

      <h2 class="primary--text text-uppercase mb-2">User Control</h2>
      <div class="mb-3">
        <div class="add dark has-shadow pa-3 disp-flex flex-center-y mb-2">
          <v-text-field solo-inverted class="mr-2" label="SteamID64" hide-details v-model="inputs.user" required></v-text-field>
          <v-btn class="ma-0" large color="primary" @click="getUser()" :disabled="!inputs.user.length">Search</v-btn>
        </div>

        <div class="user dark pa-3 disp-flex" v-if="usr">
          <img :src="usr.avatarUrl" alt="user avatar" class="avatar mr-2">
          <div class="meta number py-1 flex-grow">
            <div class="fw-semibold primary--text disp-flex flex-center-y">
              <i class="flag-sm mr-2" :class="'flag-sm-'+usr.countryCode" :title="usr.countryCode"></i>
              <span class="mr-2">{{usr.username}}</span>
              <span class="chip info text--text caption fw-semibold px-2">Rank {{usr.rank}}</span>
            </div>

            <div>
              <span class="fw-bold primary--text text-uppercase caption mr-2">SteamID</span>
              <span class="text-uppercase">
                {{usr.steamID}}
                <a :href="`https://steamcommunity.com/profiles/${usr.steamID}`" class="secondary--text caption fw-semibold" target="_blank">Steam Profile</a>
              </span>
            </div>

            <div>
              <span class="fw-bold primary--text text-uppercase caption mr-2">Total Cases Opened</span>
              <span>{{usr.betSum}}</span>
            </div>
            <div>
              <span class="fw-bold primary--text text-uppercase caption mr-2">Referral Code</span>
              <span>{{usr.ownRef}}</span>
            </div>
            <div>
              <span class="fw-bold primary--text text-uppercase caption mr-2">Redeemed Code</span>
              <span>{{usr.refCode}}</span>
            </div>

            <div class="text-faded-5">
              <span class="fw-bold primary--text text-uppercase caption mr-2">Last IP:</span>
              <span>{{usr.lastIp}}</span>
            </div>

            <br>
            <h5 class="primary--text text-uppercase">Actions</h5>
            <v-switch v-model="usr.banned" hide-details color="danger" label="Ban User"></v-switch>
          </div>
        </div>
      </div>

      <h2 class="primary--text text-uppercase mb-2">Referral Check</h2>
      <div class="mb-3">
        <div class="add dark has-shadow pa-3 disp-flex flex-center-y mb-2">
          <v-text-field solo-inverted class="mr-2" label="Code" hide-details v-model="inputs.refCode" required></v-text-field>
          <v-btn class="ma-0" large color="primary" @click="getRef()" :disabled="!inputs.refCode">Check</v-btn>
        </div>

        <div v-if="ref" class="mb-3 pa-3 dark disp-flex flex-around flex-center-y flex-wrap">
          <div class="text-center">
            <div class="number title">{{ref.usageCount | numberInt}}</div>
            <div class="secondary--text fw-bold text-uppercase">Referees</div>
          </div>
          <div class="text-center">
            <div class="number title">{{ref.caseCount | numberInt}}</div>
            <div class="secondary--text fw-bold text-uppercase">Cases Opened</div>
          </div>
          <div class="text-center">
            <div class="number title">${{ref.revenue | currencyInt}}</div>
            <div class="secondary--text fw-bold text-uppercase">Total Earned</div>
          </div>
        </div>
      </div>

      <h2 class="primary--text text-uppercase mb-2">WAX Balance Transfer</h2>
      <div class="mb-3">
        <div class="number mb-2">
          Current Balance: ${{opBalance | currencyInt}}
        </div>
        <div class="add dark has-shadow pa-3 disp-flex flex-center-y mb-2">
          <v-text-field solo-inverted class="mr-2" label="SteamID64" hide-details v-model="inputs.opskins.user" required></v-text-field>
          <v-text-field solo-inverted class="mr-2" label="Amount ($)" hide-details v-model.number="inputs.opskins.amount" required></v-text-field>
          <v-btn class="ma-0" large color="primary" @click="opTransfer()" :disabled="!inputs.opskins.user || !inputs.opskins.amount">Send</v-btn>
        </div>
      </div>

      <h4 class="primary--text text-uppercase mb-2">TriHard Checker</h4>
      <div class="mb-3 dark pa-2">
        <div class="dark lighten-1 number elevation-5 pa-2 mb-2 disp-flex flex-center-y flex-between" v-for="cashout in cashouts" :key="cashout.transaction_id">
          <div class="mr-3">{{cashout.timestamp * 1000 | formatDate}}</div>
          <div class="mr-3">
            <div class="primary--text fw-bold text-uppercase caption">{{cashout.formatted_type}}</div>
            <div>{{cashout.email}}</div>
          </div>
          <v-spacer></v-spacer>
          <div class="mr-3">${{cashout.amount | currencyInt}}</div>
        </div>
        <!-- <div class="add dark has-shadow pa-3 disp-flex flex-center-y mb-2">
          <v-text-field solo-inverted class="mr-2" label="SteamID64" hide-details v-model="inputs.opskins.user" required></v-text-field>
          <v-text-field solo-inverted class="mr-2" label="Amount ($)" hide-details v-model.number="inputs.opskins.amount" required></v-text-field>
          <v-btn class="ma-0" large color="primary" @click="opTransfer()" :disabled="!inputs.opskins.user || !inputs.opskins.amount">Send</v-btn>
        </div> -->
      </div>

    </v-card-text>
    <v-card-actions>
      <v-btn flat small @click="close()">Close</v-btn>
      <v-btn v-show="unsavedChanges" :loading="loading" round color="danger" small @click="save">
        <span class="px-3">Save Changes</span>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script src="./admin.js"></script>

<style lang="scss" scoped>
@import '../../styles/variables.scss';

textarea,
input {
  margin-top: 5px;
  background: $dark;
  padding: 8px;
  resize: none;
  width: 100%;
}

.cursor {
  cursor: pointer;
}

.chart-ctn {
  max-height: 500px;
}

.entry-list {
  max-height: 400px;
  overflow-y: auto;

  .entry {
    &:nth-child(odd) {
      background: $dark;
    }
    &:nth-child(even) {
      background: $dark + 10;
    }
  }
}

.delta {
  .icon {
    color: inherit !important;
  }

  &.success--text .icon {
    transform: rotate(180deg);
  }
}

.user {
  align-items: flex-start;
  .avatar {
    max-width: 96px;
    border-radius: 8px;
  }
}
</style>
