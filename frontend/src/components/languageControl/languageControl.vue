<template>
  <v-menu bottom offset-y :nudge-top="80" :close-on-content-click="false" max-height="300">
    <div class="language-icon" slot="activator">
      <i class="flag-sm mr-2" :class="'flag-sm-'+convertFlag($i18n.locale)"></i>
      <span class="caption primary--text fw-semibold">
        {{ $t("languageStringNative") }}
      </span>
    </div>
    <v-list class="dark" dense>
      <v-list-tile v-for="(lang, i) in langs" :key="i" @click="$i18n.locale = i">
        <v-list-tile-action>
          <i class="flag-sm" :class="'flag-sm-'+convertFlag(i)"></i>
        </v-list-tile-action>
        <v-list-tile-title>{{lang}}</v-list-tile-title>
      </v-list-tile>
      <!-- <v-list-tile href="https://poeditor.com/join/project/Ud2DYC1nj0" target="_blank" class="contribute" ripple>
        <v-list-tile-action color="red">
          <fai :icon="['fas', 'heart']" class="icon" size="sm"></fai>
        </v-list-tile-action>
        <v-list-tile-title class="fw-bold">{{ $t("contribute") }}</v-list-tile-title>
      </v-list-tile> -->
    </v-list>
  </v-menu>

</template>

<script>
import translations from '../../lang'

export default {
  name: 'LanguageControl',
  data() {
    return {
      langs: this.parse(translations),
    }
  },
  watch: {
    '$i18n.locale': function(val) {
      this.$ls.set('lang', val)
    },
  },
  methods: {
    parse(translations) {
      let langs = JSON.parse(JSON.stringify(translations))

      for (const key in langs) {
        langs[key] = langs[key].languageStringNative
      }

      return langs
    },
    convertFlag(code) {
      // custom overrides
      if (code == 'en') code = 'uk'
      return code.toUpperCase()
    },
  },
}
</script>
<style lang="scss" scoped>
@import '../../styles/variables.scss';

.language-icon {
  display: flex;
  align-items: center;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 0.7;
  }

  i {
    // transform: scale(0.5);
  }

  .icon {
    margin-left: -8px;
    font-size: 20px;
    color: rgba($primary, 0.7);
  }
}

.list__tile__action {
  min-width: 40px;
  margin-right: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list .contribute {
  transition: background 0.3s ease;

  &:hover {
    background: $success;

    .icon {
      color: $text;
      animation: pulse 0.2s ease infinite alternate;
    }
  }

  .icon {
    animation: pulse 0.7s ease infinite alternate;
    color: $danger;
  }
}

@keyframes pulse {
  from {
    transform: scale(0.7);
  }
  to {
    transform: scale(1);
  }
}
</style>

