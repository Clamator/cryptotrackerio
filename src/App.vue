<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <div class="container">
      <section>
        <div class="flex">
          <div class="max-w-xs">
            <label for="wallet" class="block text-sm font-medium text-gray-700"
              >Тикер</label
            >
            <div class="mt-1 relative rounded-md shadow-md">
              <input
                v-model="ticker"
                v-on:keydown.enter="add"
                v-on:input="findSimilar()"
                type="text"
                name="wallet"
                id="wallet"
                class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                placeholder="Например DOGE"
              />
            </div>
            <div
              v-if="hints.length > 0"
              class="flex bg-white shadow-md p-1 rounded-md shadow-md flex-wrap"
            >
              <span
                v-for="hint in hints.slice(0, 4)"
                v-bind:key="hint.symbol"
                @mousedown="changeTicker(hint)"
                @click="add"
                class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
              >
                {{ hint.name }}
              </span>
            </div>
            <div v-if="hideAddingMistake" class="text-sm text-red-600">
              Такой тикер уже добавлен
            </div>
          </div>
        </div>
        <add-ticker-button @click="add" type="button" class="my-4" />
      </section>

      <template v-if="tickers.length > 0">
        <hr class="w-full border-t border-gray-600 my-4" />
        <div>
          <button
            v-if="page > 1"
            @click="page = page - 1"
            class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            back
          </button>
          <button
            @click="page = page + 1"
            v-if="hasNextPage"
            class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            forward
          </button>
          Filter by:<input v-model="filter" />
        </div>
        <br />
        <hr class="w-full border-t border-gray-600 my-4" />
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            v-for="t in paginatedTickers"
            v-bind:key="t.name"
            @click="select(t)"
            v-bind:class="{
              'border-4': selectedTicker === t,
              'bg-red-100': this.invalidTickers.includes(t.name),
            }"
            class="bg-white overflow-hidden shadow rounded-lg border-blue-400 border-solid cursor-pointer"
          >
            <div class="px-4 py-5 sm:p-6 text-center">
              <dt class="text-sm font-medium text-gray-500 truncate">
                {{ t.name }} - USD
              </dt>
              <dd class="mt-1 text-3xl font-semibold text-gray-900">
                {{ formatPrice(t.price) }}
              </dd>
            </div>
            <div class="w-full border-t border-gray-200"></div>
            <button
              @click.stop="handleDelete(t)"
              class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 hover:opacity-20 transition-all focus:outline-none"
            >
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#718096"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              Удалить
            </button>
          </div>
        </dl>
        <hr class="w-full border-t border-gray-600 my-4" />
      </template>

      <graph-area
        @delete-graph="this.selectedTicker = null"
        :normalizedGraphMain="this.normalizedGraph"
        v-if="selectedTicker"
        :ticker="this.selectedTicker.name"
        ref="graph"
      >
      </graph-area>
    </div>
  </div>
</template>

<script>
import { subscribeToTicker, unsubscribeFromTicker } from "@/api";
import { isValidTicker } from "@/api";
import { currencyOnExport } from "@/api";
import addTickerButton from "@/components/addTickerButton";
import GraphArea from "@/components/GraphArea";

export default {
  name: "App",
  components: {
    addTickerButton,
    GraphArea,
  },
  data() {
    return {
      isInvalid: false,
      page: 1,
      filter: "",
      ticker: "",
      tickers: [],
      invalidTickers: [],
      selectedTicker: null,
      graph: [],
      addedTickers: [],
      hints: [],
      tickerList: [],
      column: this.$refs.column,
      columnW: null,
      maxGraphElements: 1,
      oldMaxGraphElements: this.maxGraphElements,
      hideAddingMistake: false,
      allTickers: [],
    };
  },
  computed: {
    pageStateOptions() {
      return {
        filter: this.filter,
        page: this.page,
      };
    },
    startIndex() {
      return (this.page - 1) * 6;
    },
    endIndex() {
      return this.page * 6;
    },
    filteredTickers() {
      return this.tickers.filter((ticker) => ticker.name.includes(this.filter));
    },
    paginatedTickers() {
      return this.filteredTickers.slice(this.startIndex, this.endIndex);
    },

    hasNextPage() {
      return this.filteredTickers.length > this.endIndex;
    },
    normalizedGraph() {
      const maxValue = Math.max(...this.graph);
      const minValue = Math.min(...this.graph);
      if (maxValue === minValue) {
        return this.graph.map(() => 50);
      }
      return this.graph.map(
        (price) => 5 + ((price - minValue) * 95) / (maxValue - minValue)
      );
    },
  },
  methods: {
    calculateMaxGraphElements() {
      if (!this.$refs.graph) {
        return;
      }
      // ширина колонки!!!
      // this.columnW = this.$refs.column[0].clientWidth;
      // console.log(this.columnW);
      this.oldMaxGraphElements = this.maxGraphElements;
      this.maxGraphElements = this.$refs.graph.clientWidth / 38;

      if (this.oldMaxGraphElements > this.maxGraphElements) {
        let difference = parseInt(
          +this.oldMaxGraphElements - +this.maxGraphElements
        );
        for (let el = 0; el < difference; el++) {
          this.graph.shift();
        }
        // this.graph = this.graph.slice(+difference - 1, -1);
      }
    },
    updateTicker(tickerName, price) {
      this.tickers
        .filter((t) => t.name === tickerName)
        .forEach((t) => {
          if (t === this.selectedTicker) {
            this.graph.push(price);
            // console.log(this.$refs.column[0].clientWidth);
            // if (this.$refs.column[0] !== undefined) {
            //   this.columnW = this.$refs.column[0].clientWidth;
            // }
            this.calculateMaxGraphElements();
            while (this.graph.length > this.maxGraphElements) {
              this.graph.shift();
            }
          }
          t.price = price;
        });
    },

    colorInRedInvalidTicker() {
      if (isValidTicker === false) {
        this.isInvalid = true;
        this.invalidTickers = [...this.invalidTickers, currencyOnExport];
      }
    },
    getAllTickers() {
      this.allTickers = async function () {
        const promise = await fetch(
          "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
        );
        const tickersAll = await promise.json();
        const tickList = Object.entries(tickersAll.Data);
        for (let el of tickList) {
          this.tickerList.push({
            name: el[1].FullName,
            symbol: el[1].Symbol,
          });
        }
      };
    },
    add() {
      const currentTicker = { name: this.ticker, price: "-" };
      this.tickers = [...this.tickers, currentTicker];
      if (this.addedTickers.includes(this.ticker)) {
        this.hideAddingMistake = true;
        this.tickers.pop();
        return false;
      }
      this.addedTickers = [...this.addedTickers, this.ticker];
      this.filter = "";

      subscribeToTicker(currentTicker.name, (newPrice) =>
        this.updateTicker(currentTicker.name, newPrice)
      );
      this.colorInRedInvalidTicker();
      this.ticker = "";
      this.hints.length = 0;
    },
    // функция, принимает на вход тикер, потом фильтрует типа оставить те тикеры, которые не равны тикеру для удаления
    handleDelete(tickerToRemove) {
      this.tickers = this.tickers.filter((t) => t !== tickerToRemove);
      if (this.selectedTicker === tickerToRemove) {
        this.selectedTicker = null;
      }
      this.addedTickers = this.addedTickers.filter(
        (ticker) => ticker !== tickerToRemove.name
      );
      this.invalidTickers = this.invalidTickers.filter(
        (ticker) => ticker !== tickerToRemove.name
      );
      unsubscribeFromTicker(tickerToRemove.name);
    },

    select(ticker) {
      this.selectedTicker = ticker;
      this.$nextTick(() => {
        this.calculateMaxGraphElements;
      });
    },
    findSimilar() {
      this.hideAddingMistake = false;
      this.hints.length = 0;
      for (let el = 0; el < this.tickerList.length; el++) {
        if (
          this.tickerList[el].name.includes(this.ticker.toUpperCase()) ||
          this.tickerList[el].symbol.includes(this.ticker.toUpperCase())
        ) {
          this.hints.push({ name: this.tickerList[el].symbol });
        }
      }
      if (this.ticker.length === 0) {
        this.hints.length = 0;
      }
    },
    changeTicker(hnt) {
      this.ticker = hnt.name;
    },
    formatPrice(price) {
      if (price === "-") {
        return price;
      }
      return price > 1 ? price.toFixed(2) : price.toPrecision(2);
    },
  },

  created() {
    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries()
    );
    this.getAllTickers();
    const VALID_KEYS = ["filter", "page"];
    VALID_KEYS.forEach((key) => {
      if (windowData[key]) {
        this[key] = windowData[key];
      }
    });

    const tickersData = localStorage.getItem("cryptonomicon-list");
    const invalidTickersLS = localStorage.getItem("invalid-tickers");

    if (invalidTickersLS) {
      this.invalidTickers = JSON.parse(invalidTickersLS);
      this.invalidTickers.forEach(() => this.colorInRedInvalidTicker());
    }

    if (tickersData) {
      this.tickers = JSON.parse(tickersData);
      this.tickers.forEach((ticker) => {
        subscribeToTicker(ticker.name, (newPrice) =>
          this.updateTicker(ticker.name, newPrice)
        );
      });
    }

    setInterval(this.updateTickers, 5000);
    this.allTickers();
    this.colorInRedInvalidTicker();
  },
  mounted() {
    window.addEventListener("resize", this.calculateMaxGraphElements);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.calculateMaxGraphElements);
  },
  watch: {
    invalidTickers() {
      localStorage.setItem(
        "invalid-tickers",
        JSON.stringify(this.invalidTickers)
      );
    },
    tickers() {
      localStorage.setItem("cryptonomicon-list", JSON.stringify(this.tickers));
    },
    selectedTicker() {
      this.graph = [];
    },
    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },
    filter() {
      this.page = 1;
    },
    pageStateOptions(value) {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );
    },
  },
};
</script>
