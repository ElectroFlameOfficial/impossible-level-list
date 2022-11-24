import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { AuthService } from '../shared/auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ImpossibleLevel } from '../shared/impossible-level';

import { LevelServiceService } from '../shared/level-service.service';
import { NoPreloading } from '@angular/router';

@Component({
  selector: 'app-admin-data-editor',
  templateUrl: './admin-data-editor.component.html',
  styleUrls: ['./admin-data-editor.component.css']
})
export class AdminDataEditorComponent implements OnInit {

  bil_name:string = ''
  bil_fps:number = 0
  bil_id:string = ''
  bil_gdv:string = '' //Gd version
  bil_ytid:string = '' //Youtube video id
  bil_c_s:string = '' //Creators short
  bil_c_f:string = '' //Creators full
  bil_tags:string = ''
  bil_upld:string = '' //Uploader
  bil_wr_min:string = ''
  bil_wr_yt:string = ''
  bil_wr:string = ''
  bil_removal:boolean = false
  bil_annotation:boolean = false
  bil_reason:string = ''; //reason for markdown
  bil_wideshotURL:string | undefined = ''; //URL to wide level shot
  bil_darktext:boolean | undefined = false;

  bil_index:number = 1;

  auditLog:string[] = [];

  bil_packaged:ImpossibleLevel = {
    id: '',
    name: '',
    fps: 0,
    level_id: '',
    gd_version: '',
    yt_videoID: '',
    creators_short: '',
    creators_full: [],
    tags: [],
    uploader: '',
    wr_min_percent: '',
    wr: '',
    wr_yt: '',
    marked_for_removal: false,
    annotated: false,
    marking_reason: '',
    position: 0,
    wide_level_shot_url: '',
    textIsDark: false
  }
  bli_buffer:ImpossibleLevel = {
    id: '',
    position: 0,
    name: '',
    fps: 0,
    level_id: '',
    gd_version: '',
    yt_videoID: '',
    creators_short: '',
    creators_full: [],
    tags: [],
    uploader: '',
    wr_min_percent: '',
    wr: '',
    wr_yt: '',
    marked_for_removal: false,
    annotated: false,
    marking_reason: '',
    wide_level_shot_url: '',
    textIsDark: false
  }

  lb_editStatus:string = 'Empty form'
  levelList: ImpossibleLevel[] = [];

  constructor(public ill_service:LevelServiceService, private auth_service: AuthService, private afAuth: AngularFireAuth) { }

  ngOnInit(): void {
    //load the list once
    this.setupList();
    //handle admin
  }

  setupList() {
    this.ill_service.getOrderedLevelList().then(doc => {
      this.levelList = doc.docs.map((e:any) => {
        const data = e.data();
        return data;
      })
    })
    //setup real-time updates
    this.ill_service.firestore.collection('ill').ref.orderBy('position').onSnapshot(snapshot => {
      let changes: ImpossibleLevel[] = snapshot.docChanges().map((e:any) => {
        const data = e.doc.data();
        return data;
      })
      //replace all of the changes
      changes.forEach((level, i) => {
        let _matchingLevelIndex = this.levelList.findIndex((arr_level) => {
          return arr_level.name == level.name && arr_level.creators_short == level.creators_short;
        });
        if(_matchingLevelIndex != undefined) {
          console.log('Updating level...');
          this.levelList[_matchingLevelIndex] = level;
        } else {
          console.log('Adding level...');
          this.levelList.push(level);
          this.levelList.sort((a, b) => {
            return a.position-b.position;
          })
        }
      })
    })
  }

  clearForm() {
    this.bil_name = '';
    this.bil_fps = 0;
    this.bil_gdv = '';
    this.bil_id = '';
    this.bil_ytid = '';
    this.bil_c_s = '';
    this.bil_c_f = '';
    this.bil_tags = '';
    this.bil_upld = '';
    this.bil_wr_min = '';
    this.bil_wr_yt = '';
    this.bil_wr = '';
    this.bil_removal = false;
    this.bil_annotation = false;
    this.bil_reason = '';
    this.bil_wideshotURL = '';
    this.bil_darktext = false;
    console.log(this.bil_name)
  }
  
  submitLevel() {
    this.packageLevel(); //package data to object
    this.lb_editStatus = 'Sending level to database...'

    let matchingLevel = this.levelList.find((arr_level) => {
      return arr_level.name == this.bil_packaged.name && arr_level.creators_short == this.bil_packaged.creators_short
    }); //check for existing level with same name/creator
    console.log(matchingLevel?.name, '<- Matched level', this.bil_packaged.name, '<- packaged level');

    if(matchingLevel == undefined) {
      this.ill_service.addLevel(this.bil_packaged).catch(error => {
        this.lb_editStatus = error.toString();
      });
      this.levelList.splice(this.bil_packaged.position-1, 0, this.bil_packaged)
      this.lb_editStatus = 'Successfully added level!'
      this.auditLog.push('Added level '+this.bil_packaged.name+' at #'+this.bil_index);
    } else {
      let matchingLevelIndex = this.levelList.findIndex((arr_level) => {
        return arr_level.name == this.bil_packaged.name && arr_level.creators_short == this.bil_packaged.creators_short;
      });
      this.bil_packaged.id = matchingLevel.id;
      this.adminLogChangedData(matchingLevel, this.bil_packaged);
      this.ill_service.updateLevel(this.bil_packaged);
      this.lb_editStatus = 'Successfully updated level!'
    }
  }
  
  
  refreshLevelListArray() {
    this.ill_service.getOrderedLevelList().then(doc => {
      this.levelList = doc.docs.map((e:any) => {
        const data = e.data();
        if (data.nameLowercase == undefined) {
          data.nameLowercase = data.name.toLowercase()
        }
        return data;
      })
    })
  }
  
  
  remapLevels() {
    if(confirm('Are you sure you want to Remap all level positions?')) {
      let _changes = 0;
      this.lb_editStatus = 'Re-mapping level positions...'
      for(let i=0; i<this.levelList.length; i++) {
        console.log(this.levelList[i].position, '=>', i+1) //compare
        if(this.levelList[i].position != i+1) {
          console.log('error in '+this.levelList[i].name+"'s position... fixing...")
          this.levelList[i].position = i+1;
          console.log(this.levelList[i].position, '->', i+1);
          if(this.levelList[i].position != i+1) {
            console.log('Failed to fix '+this.levelList[i].name+"'s level position")
          } else {
            console.log('Fixing of '+this.levelList[i].name+" complete... Updating level...")
            this.ill_service.updateLevel(this.levelList[i]);
            _changes++;
          }
        }
      }
      this.lb_editStatus = 'Re-mapping complete: '+_changes+' changes'
    }
  }

  async refreshButton() {
    await this.refreshLevelListArray()
    this.reSortLevels();
  }
  
  reSortLevels() {
    this.lb_editStatus = 'Re-sorting level list based on positions...'
    this.levelList = this.levelList.sort((a, b) => { return a.position - b.position});
    this.lb_editStatus = 'Re-sorting complete!'
  }

  packageLevel() {
    this.lb_editStatus = 'Packaging level...'
    
    //Packing normal values
    this.bil_packaged.name = this.bil_name;
    this.bil_packaged.fps = this.bil_fps;
    this.bil_packaged.level_id = this.bil_id;
    this.bil_packaged.gd_version = this.bil_gdv;
    this.bil_packaged.creators_short = this.bil_c_s;
    this.bil_packaged.uploader = this.bil_upld;
    this.bil_packaged.wr_min_percent = this.bil_wr_min;
    this.bil_packaged.wr_yt = this.bil_wr_yt;
    this.bil_packaged.wr = this.bil_wr;
    this.bil_packaged.marked_for_removal = this.bil_removal;
    this.bil_packaged.annotated = this.bil_annotation;
    this.bil_packaged.position = this.bil_index;
    this.bil_packaged.marking_reason = this.bil_reason;
    this.bil_packaged.wide_level_shot_url = this.bil_wideshotURL;
    this.bil_packaged.textIsDark = this.bil_darktext;
    
    //packing arrays
    this.bil_packaged.creators_full = this.bil_c_f.split(",");
    this.bil_packaged.tags = this.bil_tags.split(",");

    //removal of URL
    this.bil_packaged.yt_videoID = this.bil_ytid.replace('youtube.com/watch?v=', '').replace('https://','').replace('www.','').replace('youtu.be/','');
    
  }
  
  logLevelArray() {
    console.log(this.levelList);
  }

  log() {
    console.log(this.bil_name, this.bil_c_s)
  }
  
  loadDataFromLevel(level:ImpossibleLevel) {
    let matchingLevel = this.levelList.find((arr_level) => {
      return arr_level.name == level.name && arr_level.creators_short == level.creators_short;
    });
    console.log(matchingLevel);
    if(matchingLevel == undefined) {
      this.lb_editStatus = 'No Matching level found'
    } else {
      this.bli_buffer = matchingLevel;

      this.bil_name = this.bli_buffer.name;
      this.bil_c_s = this.bli_buffer.creators_short;
      this.bil_index = this.bli_buffer.position;
      this.bil_fps = this.bli_buffer.fps;
      this.bil_gdv = this.bli_buffer.gd_version;
      this.bil_ytid = this.bli_buffer.yt_videoID;
      this.bil_id = this.bli_buffer.level_id;
      this.bil_upld = this.bli_buffer.uploader;
      this.bil_wr_min = this.bli_buffer.wr_min_percent;
      this.bil_wr_yt = this.bli_buffer.wr_yt;
      this.bil_wr = this.bli_buffer.wr;
      this.bil_removal = this.bli_buffer.marked_for_removal;
      this.bil_annotation = this.bli_buffer.annotated;
      this.bil_reason = this.bli_buffer.marking_reason;
      this.bil_wideshotURL = this.bli_buffer.wide_level_shot_url;
      this.bil_darktext = this.bli_buffer.textIsDark;

      this.bil_c_f = this.bli_buffer.creators_full.toString()
      this.bil_tags = this.bli_buffer.tags.toString()

      this.bil_removal = this.bli_buffer.marked_for_removal;
      this.bil_annotation = this.bli_buffer.annotated;
      this.lb_editStatus = 'Data loaded';
    }
  }
  
  removeLevel() {
    this.packageLevel()
    let matchingLevel = this.levelList.find((arr_level) => {
      return arr_level.name == this.bil_packaged.name && arr_level.creators_short == this.bil_packaged.creators_short;
    });
    if(matchingLevel == undefined) {
      this.lb_editStatus = 'No Matching level found'
    } else {
      this.auditLog.push(matchingLevel.name+' removed')
      this.ill_service.deleteLevel(matchingLevel);
      this.lb_editStatus = 'Removed Level successfully!'
    }
  }

  adminLogChangedData(old_data:ImpossibleLevel, new_data:ImpossibleLevel) {
    //compare
    this.auditLog.push('Updated '+new_data.name+'. Here are the changes: ')
    if(old_data.fps != new_data.fps) {
      this.auditLog.push(new_data.name+' FPS updated: '+old_data.fps+' -> '+new_data.fps)
    }
    if(old_data.level_id != new_data.level_id) {
      this.auditLog.push(new_data.name+' level ID updated: '+old_data.level_id+' -> '+new_data.level_id)
    }
    if(old_data.position != new_data.position) {
      this.auditLog.push(new_data.name+' moved from '+old_data.position+' to '+new_data.position)
    }
    if(old_data.uploader != new_data.uploader) {
      this.auditLog.push(new_data.name+' uploader updated: '+new_data.uploader)
    }
    if(old_data.creators_full.toString() != new_data.creators_full.toString()) {
      this.auditLog.push(new_data.name+' creators updated')
    }
    if(old_data.tags.toString() != new_data.tags.toString()) {
      this.auditLog.push('Changed tags: '+old_data.tags.toString()+' -> '+new_data.tags.toString())
    }
    if(old_data.wr != new_data.wr) {
      this.auditLog.push('New World record achieved on'+new_data.name+': '+new_data.wr+' -> '+'(Link: '+new_data.wr_yt+')')
    }
    if(old_data.wr_min_percent != new_data.wr_min_percent) {
      this.auditLog.push('World Record minimal percentage changed from >'+old_data.wr_min_percent+'% to >'+new_data.wr_min_percent+"%")
    }
    if(!old_data.annotated && new_data.annotated) {
      this.auditLog.push('Annotation added to '+new_data.name+' - Subject to gameplay and decoration quality exemptions')
    }
    if(!old_data.marked_for_removal && new_data.marked_for_removal) {
      this.auditLog.push(new_data.name+' marked for removal: '+new_data.marking_reason)
    }
    if(old_data.annotated && !new_data.annotated) {
      this.auditLog.push('Annotation removed from '+new_data.name)
    }
    if(old_data.marked_for_removal && !new_data.marked_for_removal) {
      this.auditLog.push(new_data.name+' mark resolved')
    }
    if(old_data.yt_videoID != new_data.yt_videoID) {
      this.auditLog.push(new_data.name+' showcase video changed: '+'htpps://www.youtube.com/watch?v='+new_data.yt_videoID)
    }
  }

  async readd_database_entries() {
    let _real_ill_array:ImpossibleLevel[] = [];
    let _real_ill_keys:string[] = [];

    //load the list
    await this.ill_service.getWholeLevelList().then((snapshot:any) => {
      _real_ill_array = snapshot.docs.map((e:any) => {
        const data = e.data();
        return data;
      })
    })

    //get level database id
    await this.ill_service.getWholeLevelList().then((snapshot:any) => {
      _real_ill_keys = snapshot.docs.map((e:any) => {
        const data = e.id;
        return data;
      })
    })

    console.log(_real_ill_keys);

    await _real_ill_array.forEach((lvl, i) => {
      lvl.nameLowercase = lvl.name.toLowerCase()
      lvl.creators_full_lowercase = [];
      lvl.tagsLowercase = [];
      lvl.textIsDark = false;
      for(let j=0; j<lvl.creators_full.length; j++) {
        lvl.creators_full_lowercase[j] = lvl.creators_full[j].toLowerCase();
      }
      for(let j=0; j<lvl.tags.length; j++) {
        lvl.tagsLowercase[j] = lvl.tags[j].toLowerCase();
      }
      this.ill_service.firestore.collection('ill').doc(_real_ill_keys[i]).update(lvl);
    });

    console.log('finished')
  }
}
