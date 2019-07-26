<template>
  <div class="user-container mr-2" v-if="user">
    <img :src="user.avatarUrl" alt="User Avatar" class="avatar">

    <div class="inner" slot="activator">
      <div class="meta">
        <div class="name truncate">{{user.username}}</div>
        <div class="level">{{$t('navbar.user.level', {num: user.level || 0})}}</div>
      </div>
      <span class="icon">
        <fai :icon="['far', 'angle-down']"></fai>
      </span>
    </div>

  </div>
  <v-btn v-else round color="primary" href="/auth" class="has-glow">
    <fai :icon="['fas', 'sign-in']" size="lg" class="mr-2 icon-svg"></fai>
    {{$t('login.button')}}
    <!--<svg
      class="wax-icon mx-1"
      v-html="require('@/img/wax-logo-white.png')"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 909 1250"
    ></svg>-->
    <img class="wax-icon mx-1" :src="require('@/img/wax-logo-white.png')"/>
  </v-btn>
</template>

<script>
export default {
  name: 'userNav',
  store: ['auth'],
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
  },
}
</script>

<style lang="scss" scoped>
@import '../../styles/variables.scss';

.wax-icon {
  fill: $primary;
  width: 60px;
  vertical-align: top;
}

.user-container {
  display: flex;
  align-items: center;
  position: relative;

  img.avatar {
    border-radius: 5px;
    width: 50px;
    margin-right: 10px;
  }

  .inner {
    display: flex;
    align-items: center;
    cursor: pointer;
    .meta {
      margin-right: 10px;
    }
    > .icon {
      font-size: 20px;
      color: rgba($primary, 0.5);
    }

    &:hover {
      > .icon {
        color: $primary;
      }
    }
  }

  .name {
    font-weight: bold;
    font-size: 16px;

    max-width: 200px;
  }

  .level {
    opacity: 0.4;
    font-size: 12px;
    margin-top: -3px;
    font-family: $family-secondary;
  }
}

.list__tile__title {
  .icon {
    font-size: 18px;
    margin-right: 10px;
  }
}
</style>

