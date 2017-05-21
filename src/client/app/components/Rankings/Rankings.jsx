import React from 'react';
import PropTypes from 'prop-types';
import injectSheet from 'react-jss';
import moment from 'moment';
import classNames from 'classnames';
import * as utils from 'app/utils';
import Header from './Header';
import Row from './Row';
import Filters from './Filters';
import Loading from './Loading';
import * as types from './constants';


const styles = {
  container: {
    padding: '15px 30px',
    flexGrow: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflow: 'auto'
  },
  ico: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontWeight: 900,
    fontSize: '25px',
    color: 'white',
    textTransform: 'uppercase',
    margin: '0'
  },
  header: {
    flex: '0 0 100px',
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  tbody: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  headerLeft: {},
  headerRight: {},
  selectCurrencyTitle: {
    color: 'hsl(200, 40%, 50%)',
    fontSize: '8px',
    margin: '2px 0',
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  selectCurrency: {
    display: 'flex',
    border: '1px solid hsl(200, 90%, 50%)',
    borderRadius: '3px'
  },
  selectCurrencyItem: {
    display: 'flex',
    width: '33%',
    padding: '3px 10px',
    color: 'hsl(200, 90%, 50%)',
    fontWeight: '400',
    fontSize: '11px',
    alignItems: 'center',
    borderRight: '1px solid hsl(200, 90%, 50%)',
    '&:last-child': {
      borderRight: 'none'
    },
    '&.is-active': {
      background: 'hsl(200, 90%, 50%)',
      color: 'hsl(222, 21%, 25%)'
    },
    '&:hover': {
      cursor: 'pointer'
    }
  }
};


@injectSheet(styles)
class Rankings extends React.Component {

  static propTypes = {
    isFetching: PropTypes.bool,
    icos: PropTypes.array,
    match: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.state = {
      currency: 'USD',
      sortBy: this.getInitialSortBy(this.getType()),
      ascending: false,
      filters: {
        erc20: true
      }
    };
  }

  getType() {
    const { match: { path }} = this.props;

    if (/^\/roi-over-time/.test(path)) {
      return types.ROI_OVER_TIME;
    }

    if (/^\/vs-eth/.test(path)) {
      return types.ROI_VS_ETH;
    }

    if (/^\/vs-btc/.test(path)) {
      return types.ROI_VS_BTC;
    }

    return types.ROI_TOTAL;
  }

  getInitialSortBy(type) {
    switch (type) {
      case types.ROI_OVER_TIME: {
        return 'roi_per_month';
      }
      case types.ROI_VS_ETH: {
        return 'roi_vs_eth';
      }
      case types.ROI_VS_BTC: {
        return 'roi_vs_btc';
      }
      default: {
        return 'roi_since_ico';
      }
    }
  }

  /**
   * Return sorted & filtered ICOs.
   */
  getIcos() {
    const { icos } = this.props;
    const { sortBy, ascending, filters, currency } = this.state;
    const filtered = icos.filter((ico) => {
      if (filters.erc20 && !ico.is_erc20) {
        return false;
      }

      return true;
    });

    return filtered
      .slice()
      .sort((a, b) => handleSort(a, b, sortBy, ascending, currency));
  }


  render() {
    if (this.props.isFetching) return <Loading />;
    const { classes } = this.props;
    const type = this.getType();
    const showCurrencyPicker = type !== types.ROI_VS_ETH && type !== types.ROI_VS_BTC;
    const titles = {
      [types.ROI_OVER_TIME]: 'ROI Over Time',
      [types.ROI_TOTAL]: 'ROI Since ICO',
      [types.ROI_VS_ETH]: 'Compare Performance to Ethereum',
      [types.ROI_VS_BTC]: 'Compare Performance to Bitcoin'
    };
    const title = (
      <h3 className={classes.title}>
        {titles[type]}
      </h3>
    );
    const currencies = ['USD', 'ETH', 'BTC'];
    const selectCurrency = (
      <div className={classes.selectCurrency}>
        {currencies.map(currency =>
          <div
            onClick={() => this.setState({ currency })}
            className={classNames(classes.selectCurrencyItem, {
              'is-active': this.state.currency === currency
            })}
          >
            {currency}
          </div>
        )}
      </div>
    );
    const header = (
      <div className={classes.header}>
        <div className={classes.headerLeft}>
          {title}
          <Filters
            filters={this.state.filters}
            onUpdate={filters => this.setState({ filters })}
          />
        </div>
        <div className={classes.headerRight}>
          {showCurrencyPicker &&
            <div className={classes.selectCurrencyTitle}>
              Base Currency
            </div>
          }
          {showCurrencyPicker && selectCurrency}
        </div>
      </div>
    );

    return (
      <div className={classes.container}>
        {header}
        <Header
          sortBy={this.state.sortBy}
          onSort={(sortBy, ascending) => this.setState({ sortBy, ascending })}
          ascending={this.state.ascending}
          type={type}
          currency={this.state.currency}
        />
        {this.getIcos().map(ico =>
          <Row
            key={ico.id}
            ico={ico}
            type={type}
            currency={this.state.currency}
          />
        )}
      </div>
    );
  }
}

/* =============================================================================
=    Sort function
============================================================================= */
/**
 * Handles sorting logic for ranking.
 * @param {Object} a
 * @param {Object} b
 * @param {String} sortBy
 * @param {Boolean} ascending
 * @return {Number}
 */
function handleSort(_a, _b, sortBy, ascending, currency, startDate) {
  let a = _a[sortBy];
  let b = _b[sortBy];

  switch (sortBy) {
    case 'name': {
      a = a.toLowerCase();
      b = b.toLowerCase();
      if (a < b) return ascending ? 1 : -1;
      if (a > b) return ascending ? -1 : 1;
      return 0;
    }
    case 'start_date': {
      const format = 'MM/DD/YYYY';
      const ma = moment(a, format);
      const mb = moment(b, format);

      if (ma < mb) return ascending ? 1 : -1;
      if (ma > mb) return ascending ? -1 : 1;
      return 0;
    }
    case 'ico_price': {
      a = utils.getICOPrice(a, currency);
      b = utils.getICOPrice(b, currency);
      return ascending ? (a - b) : (b - a);
    }
    case 'current_price': {
      a = utils.getCurrentPrice(a, currency);
      b = utils.getCurrentPrice(b, currency);
      return ascending ? (a - b) : (b - a);
    }
    case 'roi_per_day': {
      a = utils.getTotalROI(_a, currency);
      b = utils.getTotalROI(_b, currency);
      a = utils.getPeriodicROI(a, _a.start_date, utils.DAILY);
      b = utils.getPeriodicROI(b, _b.start_date, utils.DAILY);
      return ascending ? (a - b) : (b - a);
    }
    case 'roi_per_week': {
      a = utils.getTotalROI(_a, currency);
      b = utils.getTotalROI(_b, currency);
      a = utils.getPeriodicROI(a, _a.start_date, utils.WEEKLY);
      b = utils.getPeriodicROI(b, _b.start_date, utils.WEEKLY);
      return ascending ? (a - b) : (b - a);
    }
    case 'roi_per_month': {
      a = utils.getTotalROI(_a, currency);
      b = utils.getTotalROI(_b, currency);
      a = utils.getPeriodicROI(a, _a.start_date, utils.MONTHLY);
      b = utils.getPeriodicROI(b, _b.start_date, utils.MONTHLY);
      return ascending ? (a - b) : (b - a);
    }
    case 'roi_since_ico': {
      a = utils.getTotalROI(_a, currency);
      b = utils.getTotalROI(_b, currency);
      return ascending ? (a - b) : (b - a);
    }
    // Numeric values should use default
    default: {
      return ascending ? (a - b) : (b - a);
    }
  }
}

export default Rankings;
