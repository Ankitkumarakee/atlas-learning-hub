module {
  public type VideoId = Nat;

  public type Category = Text;

  public type VideoSort = {
    #newest;
    #mostViewed;
    #mostLiked;
    #mostBookmarked;
  };

  public type VideoFilter = {
    search : ?Text;
    category : ?Category;
    isShort : ?Bool;
    sort : ?VideoSort;
    page : ?Nat;
    pageSize : ?Nat;
  };

  public type Video = {
    id : VideoId;
    author : Principal;
    title : Text;
    description : Text;
    category : Category;
    isShort : Bool;
    videoBlobId : Text;
    thumbnailBlobId : Text;
    durationSeconds : Nat;
    viewCount : Nat;
    likeCount : Nat;
    published : Bool;
    createdAt : Int;
    updatedAt : Int;
  };

  public type VideoInput = {
    title : Text;
    description : Text;
    category : Category;
    isShort : Bool;
    videoBlobId : Text;
    thumbnailBlobId : Text;
    durationSeconds : Nat;
    published : Bool;
  };

  public type VideoUpdate = {
    title : ?Text;
    description : ?Text;
    category : ?Category;
    isShort : ?Bool;
    thumbnailBlobId : ?Text;
    published : ?Bool;
  };

  public type VideoPage = {
    items : [Video];
    total : Nat;
    page : Nat;
    pageSize : Nat;
  };
};
