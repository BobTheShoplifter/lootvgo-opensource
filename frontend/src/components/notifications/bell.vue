<template>
  <div class="bell-ctn">
    <div class="bell" @click="show = !show">
      <span class="icon">
        <fai :icon="[count > 0 ? 'fas' : 'fal', 'bell']" size="lg"></fai>
      </span>
      <span class="label" v-if="count > 0">{{count}}</span>
    </div>

    <transition name="open">
      <div class="notifications" :class="align" v-show="show">
        <div class="notification-group" v-bind:key="i" v-for="(group, i) in notifications">
          <transition name="slide-fade">
            <div class="header" v-show="group.filter(n => !n.read).length > 0">{{i}}
              <v-btn color="secondary" class="clear" flat small @click="group.map(n => n.read = true)">Clear</v-btn>
            </div>
          </transition>

          <transition-group name="slide-fade" tag="div">
            <div class="notification" v-for="(notification, i) in group" v-bind:key="i" v-show="!notification.read">
              <div :class="['icon-ctn', notification.color]">
                <div class="clear" @click="notification.read = 1" v-ripple>
                  <fai :icon="['fal', 'times']"></fai>
                </div>
                <fai :icon="['fal', notification.icon]"></fai>
              </div>
              <div class="message" v-ripple>{{notification.message}}</div>
            </div>
          </transition-group>

        </div>
        <transition name="fade">
          <div class="empty" v-if="count < 1">No unread notifications.</div>
        </transition>
      </div>
    </transition>

  </div>

</template>

<script src="./bell.js"></script>
<style src="./bell.scss" lang="scss" scoped></style>

