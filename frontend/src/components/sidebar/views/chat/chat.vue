<template>
  <div class="inner chat">
    <div class="messages relative" @contextmenu.prevent="getMouseCoords">
      <div class="hover-hint chip text--text text-center absolute danger caption fw-semibold py-2 px-3 mt-3 text-uppercase">{{$t('sidebar.chat.hoverHint')}}</div>

      <v-menu offset-y v-model="userActions.show" class="absolute" absolute :position-x="userActions.x" :position-y="userActions.y">
        <v-list class="dark user-actions-menu" dense v-if="userActions.user">
          <div class="user pa-2 darker" :class="userActions.user.chatRank">
            <img :src="userActions.user.avatarUrl" alt="avatar" class="avatar mr-2">
            <span class="tag caption fw-bold pr-1 text-uppercase" v-if="userActions.user.rank === 2">Mod</span>
            <fai v-if="userActions.user.rank === 3" :icon="['fas', 'badge-check']" class="icon body-1 mr-1 primary--text"></fai>
            <span>{{userActions.user.username}}</span>
          </div>

          <v-list-tile :href="`https://steamcommunity.com/profiles/${userActions.user.steamID}`" target="_blank">
            Open Steam Profile
          </v-list-tile>
          <v-list-tile @click="input += `@${userActions.user.steamID} `">
            Mention
          </v-list-tile>
          <!-- mods -->
          <div class="mod-menu danger--text number" v-if="user && user.rank > 0 && user.rank < 3">
            <v-list-tile @click="send(`/purge ${userActions.user.steamID}`)">
              <span class="fw-semibold">Purge</span>
            </v-list-tile>
            <v-list-tile @click="send(`/mute ${userActions.user.steamID} 300`)">
              <span class="fw-semibold">Mute (5m)</span>
            </v-list-tile>
            <v-list-tile @click="input = `/mute ${userActions.user.steamID} seconds`">
              <span class="fw-semibold">Mute (custom duration)</span>
            </v-list-tile>
            <v-list-tile @click="send(`/unmute ${userActions.user.steamID}`)">
              <span class="fw-semibold">Unmute</span>
            </v-list-tile>
          </div>
        </v-list>
      </v-menu>

      <transition-group name="fade">

        <div class="message mb-2" v-for="message in rooms[currentRoom]" :key="message.id" :class="[message.user && message.user.chatRank, {highlight: message.mentioned}]">
          <div v-if="message.announcement" class="inner disp-flex announcement px-2 py-1">
            <div class="meta">
              <div class="number disp-flex flex-center-y flex-between">
                <div class="subheading text-uppercase fw-bold danger--text">
                  <fai :icon="['far', 'bullhorn']" class="danger--text mr-1"></fai>
                  Announcement
                </div>
                <div class="caption secondary--text fw-semibold text-faded-3">{{message.timestamp}}</div>
              </div>
              <div class="number msg-text">{{message.message}}</div>
            </div>
          </div>
          <div v-else class="inner disp-flex px-2" @contextmenu.prevent="userActionsMenu(message.user)">
            <img :src="message.user.avatarUrl" alt="user avatar" class="avatar flex-no-shrink mr-2">
            <div class="meta">
              <div class="number disp-flex flex-center-y flex-between">
                <div class="fw-semibold username" :class="message.user.chatRank">
                  <span class="tag caption fw-bold pr-1 text-uppercase" v-if="message.user.rank === 2">Mod</span>
                  <fai v-if="message.user.rank === 3" :icon="['fas', 'badge-check']" class="icon body-1 mr-1 primary--text"></fai>
                  <span>{{message.user.username}}</span>
                </div>
                <div class="caption flex-no-shrink secondary--text fw-semibold text-faded-5">{{message.timestamp}}</div>
              </div>
              <div class="number msg-text">{{message.message}}</div>
            </div>
          </div>

        </div>

      </transition-group>
    </div>

    <div class="input" slot="activator" v-if="user">
      <transition name="scaleUp">
        <v-list dense class="darker autocomplete" v-show="autocomplete.active">
          <transition-group name="fade">
            <v-list-tile class="fw-semibold title" @click="replaceMention('@'+entry.steamID)" v-for="(entry, i) in autocomplete.list" :key="i" :class="{active: entry.selected}">
              <img :src="entry.avatarUrl" alt="user avatar" class="avatar mr-2">
              <span class="number text-faded-5">@{{entry.username}}</span>
            </v-list-tile>
          </transition-group>
        </v-list>
      </transition>

      <div class="input-group pt-0 number disp-flex flex-center-y" v-if="rulesRead">
        <textarea maxlength="255" @keydown="keypressHandler" @keypress.enter.prevent="send()" rows="4" v-model="input" :placeholder="$t('sidebar.chat.placeholder')"></textarea>
        <fai :icon="['far','paper-plane']" class="icon primary--text ml-2 mr-4" @click="send()"></fai>
        <v-menu offset-y top left :close-on-content-click="false">
          <fai slot="activator" :icon="['far','smile']" class="icon primary--text ml-2 mr-4"></fai>
          <v-card>
            <picker v-bind="pickerOptions" @click="insertEmoji"></picker>
          </v-card>
        </v-menu>
      </div>

      <div class="pa-3 text-center" v-if="!rulesRead">
        <div class="mb-2">{{$t('sidebar.chat.agree')}}</div>
        <v-btn color="quaternary" @click.native="rulesOpen = true" class="has-glow">
          <span class="py-2">
            <fai :icon="['far', 'info-circle']" size="lg" class="mr-2 icon-svg"></fai>
            {{$t('sidebar.chat.rules.title')}}
          </span>
        </v-btn>
      </div>
      <div class="bar px-2 darker disp-flex flex-between">
        <div v-if="user && user.rank > 0 && user.rank < 3" class="online disp-flex flex-center-y caption number text-uppercase">
          <fai :icon="['fas', 'circle']" class="primary--text mr-2" size="sm"></fai>
          <span class="text-faded-5 mr-1">{{state.onlineUsers.toLocaleString()}}</span>
          <span class="text-faded-3">{{$t('sidebar.chat.footer.users')}}</span>
        </div>
        <v-spacer></v-spacer>
        <v-menu full-width top left offset-y nudge-top="10" v-model="rulesOpen" :close-on-content-click="false">
          <v-btn slot="activator" flat color="quaternary">
            <span class="fw-bold caption">{{$t('sidebar.chat.rules.title')}}</span>
          </v-btn>
          <v-card color="dark">
            <v-card-title class="quaternary fw-bold">{{$t('sidebar.chat.rules.title')}}</v-card-title>
            <v-card-text>
              <p>{{$t('sidebar.chat.rules.description')}}</p>

              <ol class="number">
                <li v-for="rule in $t('sidebar.chat.rules.list')" :key="rule">{{rule}}</li>
              </ol>

              <b class="">{{$t('sidebar.chat.rules.warning')}}</b>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn v-if="rulesRead" flat color="text" @click="rulesOpen = false">{{$t('sidebar.chat.rules.close')}}</v-btn>
              <v-btn v-else flat color="success" @click="rulesRead = true; rulesOpen = false">{{$t('sidebar.chat.rules.agree')}}</v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
      </div>
    </div>

    <div class="py-3 text-center no-auth" v-if="!user">
      <div class="mb-2">{{ $t('login.toChat') }}</div>
      <v-btn round color="primary" href="/auth" class="has-glow">
        <span class="py-2">
          <fai :icon="['fas', 'sign-in']" size="lg" class="mr-2 icon-svg"></fai>
          {{ $t('login.button') }}
          <img class="wax-icon mx-1" :src="require('@/img/wax-logo-white.png')"/>
        </span>
      </v-btn>
    </div>
  </div>

</template>

<script src="./chat.js"></script>
<style src="./chat.scss" lang="scss" scoped></style>
