import React, { PureComponent as Component } from 'react';
import {
  Table,
  Card,
  Badge,
  Select,
  Button,
  Modal,
  Row,
  Col,
  message,
  Popconfirm,
  Switch,
  Tooltip
} from 'antd';
import PropTypes from 'prop-types';
import { fetchGroupMsg } from 'client/reducer/modules/group';
import { connect } from 'react-redux';
import ErrMsg from 'client/components/ErrMsg/ErrMsg.js';
import { fetchGroupMemberList } from 'client/reducer/modules/group.js';
import {
  fetchProjectList,
  getProjectMemberList,
  getProject,
  addMember,
  delMember,
  changeMemberRole,
  changeMemberEmailNotice
} from 'client/reducer/modules/project.js';
import UsernameAutoComplete from 'client/components/UsernameAutoComplete/UsernameAutoComplete.js';
import 'client/containers/Project/Setting/Setting.scss';
import axios from 'axios';

const Option = Select.Option;

const arrayAddKey = arr => {
  return arr.map((item, index) => {
    return {
      ...item,
      key: index
    };
  });
};

@connect(
  state => {
    return {
      projectMsg: state.project.currProject,
      uid: state.user.uid,
      projectList: state.project.projectList
    };
  },
  {
    fetchGroupMemberList,
    getProjectMemberList,
    addMember,
    delMember,
    fetchGroupMsg,
    changeMemberRole,
    getProject,
    fetchProjectList,
    changeMemberEmailNotice
  }
)
class ProjectMember extends Component {
  constructor(props) {
    super(props);
    this.state = {
      groupMemberList: [],
      projectMemberList: [],
      groupName: '',
      role: '',
      visible: false,
      dataSource: [],
      inputUids: [],
      inputRole: 'dev',
      modalVisible: false,
      selectProjectId: 0
    };
  }
  static propTypes = {
    match: PropTypes.object,
    projectId: PropTypes.number,
    projectMsg: PropTypes.object,
    uid: PropTypes.number,
    addMember: PropTypes.func,
    delMember: PropTypes.func,
    changeMemberRole: PropTypes.func,
    getProject: PropTypes.func,
    fetchGroupMemberList: PropTypes.func,
    fetchGroupMsg: PropTypes.func,
    getProjectMemberList: PropTypes.func,
    fetchProjectList: PropTypes.func,
    projectList: PropTypes.array,
    changeMemberEmailNotice: PropTypes.func
  };

  showAddMemberModal = () => {
    this.setState({
      visible: true
    });
  };

  asyncProjectGroup = () => {
      axios.post('/api/plugin/gitlab/asyncProject', this.props.projectMsg).then(res => {
          if (!res.data.errcode) {
              this.reFetchList();
              message.success('????????????')
          } else
              message.error(res.data.errmsg);
      });
  }

  showImportMemberModal = async () => {
    await this.props.fetchProjectList(this.props.projectMsg.group_id);
    this.setState({
      modalVisible: true
    });
  };

  // ??????????????????

  reFetchList = () => {
    this.props.getProjectMemberList(this.props.match.params.id).then(res => {
      this.setState({
        projectMemberList: arrayAddKey(res.payload.data.data),
        visible: false,
        modalVisible: false
      });
    });
  };

  handleOk = () => {
    this.addMembers(this.state.inputUids);
  };

  // ??? - ????????????
  addMembers = memberUids => {
    this.props
      .addMember({
        id: this.props.match.params.id,
        member_uids: memberUids,
        role: this.state.inputRole
      })
      .then(res => {
        if (!res.payload.data.errcode) {
          const { add_members, exist_members } = res.payload.data.data;
          const addLength = add_members.length;
          const existLength = exist_members.length;
          this.setState({
            inputRole: 'dev',
            inputUids: []
          });
          message.success(`????????????! ??????????????? ${addLength} ???????????? ${existLength} ????????????`);
          this.reFetchList(); // ?????????????????????????????????????????????
        }
      });
  };
  // ??????????????? ????????????????????????
  changeNewMemberRole = value => {
    this.setState({
      inputRole: value
    });
  };

  // ??? - ??????????????????
  deleteConfirm = member_uid => {
    return () => {
      const id = this.props.match.params.id;
      this.props.delMember({ id, member_uid }).then(res => {
        if (!res.payload.data.errcode) {
          message.success(res.payload.data.errmsg);
          this.reFetchList(); // ?????????????????????????????????????????????
        }
      });
    };
  };

  // ??? - ??????????????????
  changeUserRole = e => {
    const id = this.props.match.params.id;
    const role = e.split('-')[0];
    const member_uid = e.split('-')[1];
    this.props.changeMemberRole({ id, member_uid, role }).then(res => {
      if (!res.payload.data.errcode) {
        message.success(res.payload.data.errmsg);
        this.reFetchList(); // ?????????????????????????????????????????????
      }
    });
  };

  // ????????????????????????????????????
  changeEmailNotice = async (notice, member_uid) => {
    const id = this.props.match.params.id;
    await this.props.changeMemberEmailNotice({ id, member_uid, notice });
    this.reFetchList(); // ?????????????????????????????????????????????
  };

  // ???????????????
  handleCancel = () => {
    this.setState({
      visible: false
    });
  };
  // ???????????????????????????
  handleModalCancel = () => {
    this.setState({
      modalVisible: false
    });
  };

  // ??????????????????
  handleChange = key => {
    this.setState({
      selectProjectId: key
    });
  };

  // ???????????????????????????
  handleModalOk = async () => {
    // ??????????????????????????????
    const menberList = await this.props.getProjectMemberList(this.state.selectProjectId);
    const memberUidList = menberList.payload.data.data.map(item => {
      return item.uid;
    });
    this.addMembers(memberUidList);
  };

  onUserSelect = uids => {
    this.setState({
      inputUids: uids
    });
  };

  async componentWillMount() {
    const groupMemberList = await this.props.fetchGroupMemberList(this.props.projectMsg.group_id);
    const groupMsg = await this.props.fetchGroupMsg(this.props.projectMsg.group_id);
    const projectMemberList = await this.props.getProjectMemberList(this.props.match.params.id);
    this.setState({
      groupMemberList: groupMemberList.payload.data.data,
      groupName: groupMsg.payload.data.data.group_name,
      projectMemberList: arrayAddKey(projectMemberList.payload.data.data),
      role: this.props.projectMsg.role
    });
  }

  render() {
    const isEmailChangeEable = this.state.role === 'owner' || this.state.role === 'admin';
    const columns = [
      {
        title:
          this.props.projectMsg.name + ' ???????????? (' + this.state.projectMemberList.length + ') ???',
        dataIndex: 'username',
        key: 'username',
        render: (text, record) => {
          return (
            <div className="m-user">
              <img src={'/api/user/avatar?uid=' + record.uid} className="m-user-img" />
              <p className="m-user-name">{text}</p>
              <Tooltip placement="top" title="????????????">
                <span>
                  <Switch
                    size="small"
                    checkedChildren="???"
                    unCheckedChildren="???"
                    checked={record.email_notice}
                    disabled={!(isEmailChangeEable || record.uid === this.props.uid)}
                    onChange={e => this.changeEmailNotice(e, record.uid)}
                  />
                </span>
              </Tooltip>
            </div>
          );
        }
      },
      {
        title:
          this.state.role === 'owner' || this.state.role === 'admin' ? (
            <div className="btn-container">
              <Button className="btn" type="primary" icon="plus" onClick={this.showAddMemberModal}>
                ????????????
              </Button>
              <Button className="btn" icon="plus" onClick={this.showImportMemberModal}>
                ??????????????????
              </Button>
              <Button className="btn" onClick={this.asyncProjectGroup}>
                gitlab??????????????????
              </Button>
            </div>
          ) : (
            ''
          ),
        key: 'action',
        className: 'member-opration',
        render: (text, record) => {
          if (this.state.role === 'owner' || this.state.role === 'admin') {
            return (
              <div>
                <Select
                  value={record.role + '-' + record.uid}
                  className="select"
                  onChange={this.changeUserRole}
                >
                  <Option value={'owner-' + record.uid}>??????</Option>
                  <Option value={'dev-' + record.uid}>?????????</Option>
                  <Option value={'guest-' + record.uid}>??????</Option>
                </Select>
                <Popconfirm
                  placement="topRight"
                  title="?????????????????????? "
                  onConfirm={this.deleteConfirm(record.uid)}
                  okText="??????"
                  cancelText=""
                >
                  <Button type="danger" icon="delete" className="btn-danger" />
                </Popconfirm>
              </div>
            );
          } else {
            // ?????????????????????????????? ???????????????
            if (record.role === 'owner') {
              return '??????';
            } else if (record.role === 'dev') {
              return '?????????';
            } else if (record.role === 'guest') {
              return '??????';
            } else {
              return '';
            }
          }
        }
      }
    ];
    // ??????????????????????????????????????????
    const children = this.props.projectList.map((item, index) => (
      <Option key={index} value={'' + item._id}>
        {item.name}
      </Option>
    ));

    return (
      <div className="g-row">
        <div className="m-panel">
          {this.state.visible ? (
            <Modal
              title="????????????"
              visible={this.state.visible}
              onOk={this.handleOk}
              onCancel={this.handleCancel}
            >
              <Row gutter={6} className="modal-input">
                <Col span="5">
                  <div className="label usernamelabel">?????????: </div>
                </Col>
                <Col span="15">
                  <UsernameAutoComplete callbackState={this.onUserSelect} />
                </Col>
              </Row>
              <Row gutter={6} className="modal-input">
                <Col span="5">
                  <div className="label usernamelabel">??????: </div>
                </Col>
                <Col span="15">
                  <Select defaultValue="dev" className="select" onChange={this.changeNewMemberRole}>
                    <Option value="owner">??????</Option>
                    <Option value="dev">?????????</Option>
                    <Option value="guest">??????</Option>
                  </Select>
                </Col>
              </Row>
            </Modal>
          ) : (
            ''
          )}
          <Modal
            title="??????????????????"
            visible={this.state.modalVisible}
            onOk={this.handleModalOk}
            onCancel={this.handleModalCancel}
          >
            <Row gutter={6} className="modal-input">
              <Col span="5">
                <div className="label usernamelabel">?????????: </div>
              </Col>
              <Col span="15">
                <Select
                  showSearch
                  style={{ width: 200 }}
                  placeholder="?????????????????????"
                  optionFilterProp="children"
                  onChange={this.handleChange}
                >
                  {children}
                </Select>
              </Col>
            </Row>
          </Modal>

          <Table
            columns={columns}
            dataSource={this.state.projectMemberList}
            pagination={false}
            locale={{ emptyText: <ErrMsg type="noMemberInProject" /> }}
            className="setting-project-member"
          />
          <Card
            bordered={false}
            title={
              this.state.groupName + ' ???????????? ' + '(' + this.state.groupMemberList.length + ') ???'
            }
            hoverable={true}
            className="setting-group"
          >
            {this.state.groupMemberList.length ? (
              this.state.groupMemberList.map((item, index) => {
                return (
                  <div key={index} className="card-item">
                    <img
                      src={
                        location.protocol +
                        '//' +
                        location.host +
                        '/api/user/avatar?uid=' +
                        item.uid
                      }
                      className="item-img"
                    />
                    <p className="item-name">
                      {item.username}
                      {item.uid === this.props.uid ? (
                        <Badge
                          count={'???'}
                          style={{
                            backgroundColor: '#689bd0',
                            fontSize: '13px',
                            marginLeft: '8px',
                            borderRadius: '4px'
                          }}
                        />
                      ) : null}
                    </p>
                    {item.role === 'owner' ? <p className="item-role">??????</p> : null}
                    {item.role === 'dev' ? <p className="item-role">?????????</p> : null}
                    {item.role === 'guest' ? <p className="item-role">??????</p> : null}
                  </div>
                );
              })
            ) : (
              <ErrMsg type="noMemberInGroup" />
            )}
          </Card>
        </div>
      </div>
    );
  }
}

export default ProjectMember;
